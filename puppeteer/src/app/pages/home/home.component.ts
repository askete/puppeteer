// src/app/pages/home/home.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PdfService, GenerateResponse } from '../../core/pdf/pdf.service';

interface TemplateMeta {
  id: string;              // nombre del fichero en S3 (sin .html)
  title: string;           // título visible
  description: string;     // descripción corta
  showAsegurado: boolean;
  showNombre: boolean;
  showFecha: boolean;
  showGastos: boolean;     // si requiere el bloque de gastos
}

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(public auth: AuthService, private pdf: PdfService) {
    // seleccionamos por defecto la primera plantilla (si hay)
    if (this.templates.length) {
      this.selectTemplate(this.templates[0]);
    }
  }

  // 🔹 Aquí defines tus plantillas (más adelante puedes cargarlas de backend/S3)
  templates: TemplateMeta[] = [
    {
      id: 'prueba',
      title: 'Liquidación de gastos médicos',
      description: 'Genera una hoja de liquidación con detalle de gastos presentados y elegibles.',
      showAsegurado: true,
      showNombre: true,
      showFecha: true,
      showGastos: true
    },
    {
      id: 'carta_simple',
      title: 'Carta simple al asegurado',
      description: 'Carta genérica sin detalle de gastos, solo datos básicos del asegurado.',
      showAsegurado: true,
      showNombre: true,
      showFecha: true,
      showGastos: false
    }
    // 👉 Añade aquí más plantillas según vayas creando HTMLs en S3
  ];

  selectedTemplate?: TemplateMeta | null = null;

  // valores que ya usabas
  plantilla: string | null = null;
  asegurado = 'Juan_Perez_12345';
  nombreCompletoRazonSocial = 'JUAN PÉREZ S.A.';
  fecha = new Date().toISOString().slice(0, 10); // yyyy-mm-dd

  gastos: Array<{ descripcion: string; presentado: string; elegible: string }> = [
    { descripcion: '', presentado: '', elegible: '' }
  ];

  loading = false;
  errorMsg = '';
  result: GenerateResponse | null = null;

  selectTemplate(t: TemplateMeta): void {
    this.selectedTemplate = t;
    this.plantilla = t.id; // importantísimo: esto es lo que usas para S3
    this.errorMsg = '';
    this.result = null;
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

    this.loading = true;
    this.errorMsg = '';
    this.result = null;

    this.pdf
      .generate({
        plantilla: this.plantilla,
        asegurado: this.asegurado,
        nombreCompletoRazonSocial: this.nombreCompletoRazonSocial,
        fecha: this.fecha,
        gastos: this.gastos
      } as any)
      .subscribe({
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
