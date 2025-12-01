// src/app/pages/home/home.component.ts
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PdfService, GenerateResponse } from '../../core/pdf/pdf.service';

interface TemplateMeta {
  id: string;
  title: string;
  description: string;
  showAsegurado: boolean;
  showNombre: boolean;
  showFecha: boolean;
  showGastos: boolean;
}

// 👇 tipos que devuelve la lambda getTemplateVariables
type VariableType = 'string' | 'date' | 'table' | 'gastos';

interface TemplateVariable {
  name: string;
  type: VariableType;
  fields?: string[];      // para type === 'table' o 'gastos'
  value?: any;
}


@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  constructor(public auth: AuthService, private pdf: PdfService) { }

  templates: TemplateMeta[] = [];
  selectedTemplate?: TemplateMeta | null = null;

  plantilla: string | null = null;

  // Campos “especiales” que ya tenías en el diseño
  nombreCompletoRazonSocial = '';
  fecha = new Date().toISOString().slice(0, 10);

  loading = false;                 // generar documento
  templatesLoading = false;        // cargar plantillas
  errorMsg = '';
  result: GenerateResponse | null = null;
  private currentUserId: string | null = null;

  // 🔹 Variables dinámicas
  // - scalarVariables: inputs normales (string/date)
  // - tableVariables : variables de tipo tabla (incluido 'gastos')
  // - tableData      : datos de cada tabla (filas)
  templateVariables: TemplateVariable[] = [];               // alias para el HTML antiguo
  scalarVariables: TemplateVariable[] = [];
  tableVariables: TemplateVariable[] = [];
  tableData: { [varName: string]: any[] } = {};

  variablesLoading = false;
  variablesError = '';

  ngOnInit(): void {
    this.auth.user$.subscribe(user => {
      console.log('user$ en home:', user);

      if (!user) {
        this.currentUserId = null;
        this.templates = [];
        this.selectedTemplate = null;
        this.plantilla = null;
        this.templatesLoading = false;
        return;
      }

      this.currentUserId = user.uid;
      console.log('Cargando plantillas para userId:', user.uid);

      this.templatesLoading = true;

      this.pdf.getTemplatesForUser(user.uid).subscribe({
        next: (templates) => {
          console.log('Respuesta getTemplatesForUser:', templates);

          const filtered = (templates || []).filter((t: any) => {
            const rawId = (t.id ?? '').toString();
            const normalized = rawId
              .toLowerCase()
              .replace(/[_-]/g, '');

            const isEmailBody = normalized.startsWith('cuerpodecorreo');

            if (isEmailBody) {
              console.log('[Filtro] Ignorando plantilla de cuerpo de correo:', rawId);
            }

            return !isEmailBody;
          });

          this.templates = filtered.map((t: any) => this.toTemplateMeta(t));

          if (this.templates.length) {
            this.selectTemplate(this.templates[0]);
          } else {
            this.selectedTemplate = null;
            this.plantilla = null;
          }

          this.templatesLoading = false;
        },
        error: (err) => {
          console.error('Error cargando plantillas', err);
          this.errorMsg = 'Error cargando plantillas del usuario.';
          this.templatesLoading = false;
        }
      });
    });
  }

  // Mapea lo que devuelve la API a lo que necesita el front
  private toTemplateMeta(t: any): TemplateMeta {
    if (t.id === 'prueba' && !t.description) {
      return {
        id: t.id,
        title: t.title || 'Liquidación de gastos médicos',
        description:
          'Genera una hoja de liquidación con detalle de gastos presentados y elegibles.',
        showAsegurado: true,
        showNombre: true,
        showFecha: true,
        showGastos: true
      };
    }

    if (t.id === 'carta_simple' && !t.description) {
      return {
        id: t.id,
        title: t.title || 'Carta simple al asegurado',
        description:
          'Carta genérica sin detalle de gastos, solo datos básicos del asegurado.',
        showAsegurado: true,
        showNombre: true,
        showFecha: true,
        showGastos: false
      };
    }

    // genérico para plantillas nuevas
    return {
      id: t.id,
      title: t.title || t.id,
      description:
        t.description || 'Plantilla personalizada de este usuario.',
      showAsegurado: t.showAsegurado ?? true,
      showNombre: t.showNombre ?? true,
      showFecha: t.showFecha ?? true,
      showGastos: t.showGastos ?? false
    };
  }

  selectTemplate(t: TemplateMeta): void {
    this.selectedTemplate = t;
    this.plantilla = t.id;
    this.errorMsg = '';
    this.result = null;

    // reset dinámicos
    this.templateVariables = [];
    this.scalarVariables = [];
    this.tableVariables = [];
    this.tableData = {};
    this.variablesError = '';

    if (this.currentUserId) {
      this.loadTemplateVariables(this.currentUserId, t.id);
    }
  }

 private loadTemplateVariables(userId: string, templateId: string): void {
  this.variablesLoading = true;

  this.pdf.getTemplateVariables(userId, templateId).subscribe({
    next: (resp) => {
      this.variablesLoading = false;

      const { templateId: _tid, variables } = resp;

      // 👇 aquí forzamos el tipo a TemplateVariable[]
      const allVars = (variables || []) as TemplateVariable[];

      // Campos que ya tienes fijos en el componente
      const specialScalarNames = new Set([
        'nombreCompletoRazonSocial',
        'fecha'
      ]);

      // 1) escalares (string/date) excepto los especiales
      this.scalarVariables = allVars
        .filter(v => v.type === 'string' || v.type === 'date')
        .filter(v => !specialScalarNames.has(v.name))
        .map(v => ({
          ...v,
          value: v.type === 'date'
            ? new Date().toISOString().slice(0, 10)
            : ''
        }));

      // 2) tablas (table + gastos)
      this.tableVariables = allVars
        .filter(v => v.type === 'table' || v.type === 'gastos');

      // 3) inicializar datos de tablas
      this.tableData = {};
      this.tableVariables.forEach(tv => {
        const fields = tv.fields || [];
        const emptyRow = fields.reduce((acc, f) => {
          acc[f] = '';
          return acc;
        }, {} as any);
        this.tableData[tv.name] = [emptyRow];
      });

      // Alias para que templateVariables siga funcionando en tu HTML si lo usas
      this.templateVariables = this.scalarVariables;

      // Marcar showGastos si hay una tabla de gastos
      if (this.selectedTemplate && this.tableVariables.some(v => v.name === 'gastos' || v.type === 'gastos')) {
        this.selectedTemplate.showGastos = true;
      }
    },
    error: (err) => {
      console.error('Error obteniendo variables de plantilla', err);
      this.variablesLoading = false;
      this.variablesError = 'No se pudieron cargar las variables de la plantilla.';
    }
  });
}


  // 🔹 Añadir una fila a cualquier tabla dinámica
  addTableRow(varName: string): void {
    const tv = this.tableVariables.find(t => t.name === varName);
    if (!tv || !tv.fields?.length) return;

    const newRow = tv.fields.reduce((acc, f) => {
      acc[f] = '';
      return acc;
    }, {} as any);

    const current = this.tableData[varName] || [];
    this.tableData[varName] = [...current, newRow];
  }

  // 🔹 Eliminar una fila concreta de cualquier tabla
  removeTableRow(varName: string, index: number): void {
    const rows = this.tableData[varName];
    if (!rows || rows.length <= 1) return; // deja al menos una fila
    rows.splice(index, 1);
  }

  generar(): void {
    if (!this.plantilla) {
      this.errorMsg = 'Debes seleccionar una plantilla.';
      return;
    }

    const user = this.auth.currentUser;
    if (!user) {
      this.errorMsg = 'No hay usuario autenticado. Vuelve a iniciar sesión.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.result = null;

    const payload: any = {
      plantilla: this.plantilla,
      userId: user.uid
    };

    // Campos “especiales” que sigues usando de forma explícita
    if (this.nombreCompletoRazonSocial) {
      payload.nombreCompletoRazonSocial = this.nombreCompletoRazonSocial;
    }
    if (this.fecha) {
      payload.fecha = this.fecha;
    }

    // 1) Variables escalares dinámicas
    this.scalarVariables.forEach(v => {
      payload[v.name] = v.value;
    });

    // 2) Variables de tabla dinámicas (gastos, filasAsignaturas, lo que sea)
    this.tableVariables.forEach(tv => {
      payload[tv.name] = this.tableData[tv.name] || [];
    });

    this.pdf.generate(payload).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
      },
      error: (err) => {
        this.errorMsg =
          err?.message ||
          err?.error?.message ||
          'Error al generar el documento';
        this.loading = false;
      }
    });
  }
}
