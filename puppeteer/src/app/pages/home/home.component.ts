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

interface AsignaturaRow {
  nombre: string;
  profesor: string;
  tr1: string;
  tr2: string;
  tr3: string;
  final: string;
  obs: string;
}


// 👇 variables que devuelve la lambda
interface TemplateVariable {
  name: string;
  type: string; // 'string' | 'date' | 'gastos'
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
  nombreCompletoRazonSocial = '';                           // el usuario lo escribe
  fecha = new Date().toISOString().slice(0, 10);            // día de hoy por defecto


  gastos: Array<{ descripcion: string; presentado: string; elegible: string }> =
    [{ descripcion: '', presentado: '', elegible: '' }];

  // 👇 igual que gastos, pero para asignaturas
  asignaturas: AsignaturaRow[] = [
    { nombre: '', profesor: '', tr1: '', tr2: '', tr3: '', final: '', obs: '' }
  ];
  hasAsignaturas = false;

  loading = false;                 // generar documento
  templatesLoading = false;        // 👈 NUEVO: cargar plantillas
  errorMsg = '';
  result: GenerateResponse | null = null;
  private currentUserId: string | null = null;


  // 👇 NUEVO: variables dinámicas de la plantilla
  templateVariables: TemplateVariable[] = [];
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
        this.templatesLoading = false;   // 👈 reseteamos por si acaso
        return;
      }

      this.currentUserId = user.uid;
      console.log('Cargando plantillas para userId:', user.uid);

      this.templatesLoading = true;      // 👈 empezamos loading

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

          this.templatesLoading = false;  // 👈 fin loading OK
        },
        error: (err) => {
          console.error('Error cargando plantillas', err);
          this.errorMsg = 'Error cargando plantillas del usuario.';
          this.templatesLoading = false;  // 👈 fin loading con error
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

    // 👇 reseteamos variables dinámicas
    this.templateVariables = [];
    this.variablesError = '';

    // 👇 si tenemos userId, pedimos variables a la lambda
    if (this.currentUserId) {
      this.loadTemplateVariables(this.currentUserId, t.id);
    }
  }

  private loadTemplateVariables(userId: string, templateId: string): void {
    this.variablesLoading = true;

    this.pdf.getTemplateVariables(userId, templateId).subscribe({
      next: ({ templateId: _tid, variables }) => {
        this.variablesLoading = false;

        const specialNames = new Set([
          'nombreCompletoRazonSocial',
          'fecha',
          'gastos',
          'gastos2',
          'filasAsignaturas'  // 👈 NUEVO: lo tratamos de forma especial
        ]);

        // Detectamos si esta plantilla usa filasAsignaturas
        this.hasAsignaturas = !!variables?.some(
          v => v.name === 'filasAsignaturas' || v.type === 'asignaturas'
        );

        // 👇 dejamos fuera las que ya manejamos con campos propios
        this.templateVariables = (variables || [])
          .filter(v => !specialNames.has(v.name))
          .map(v => ({ ...v, value: '' }));

        // 👇 si la lambda detecta 'gastos' pero el meta no lo marca, lo activamos
        if (variables?.some(v => v.type === 'gastos')) {
          if (this.selectedTemplate) {
            this.selectedTemplate.showGastos = true;
          }
        }
      },
      error: (err) => {
        console.error('Error obteniendo variables de plantilla', err);
        this.variablesLoading = false;
        this.variablesError = 'No se pudieron cargar las variables de la plantilla.';
      }
    });
  }


  addAsignatura(): void {
    this.asignaturas.push({
      nombre: '',
      profesor: '',
      tr1: '',
      tr2: '',
      tr3: '',
      final: '',
      obs: ''
    });
  }

  removeAsignatura(i: number): void {
    this.asignaturas.splice(i, 1);
  }


  addGasto(): void {
    this.gastos.push({ descripcion: '', presentado: '', elegible: '' });
  }

  removeGasto(i: number): void {
    this.gastos.splice(i, 1);
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

    // 👇 construimos el payload base
    const payload: any = {
      plantilla: this.plantilla,
      nombreCompletoRazonSocial: this.nombreCompletoRazonSocial,
      fecha: this.fecha,
      gastos: this.gastos,
      filasAsignaturas: this.asignaturas,   // 👈 NUEVO
      userId: user.uid
    };

    // añadimos todas las variables dinámicas (aquí entrará 'asegurado' si la plantilla lo tiene)
    this.templateVariables.forEach(v => {
      payload[v.name] = v.value;
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
