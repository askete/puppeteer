import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PdfService, GenerateResponse } from '../../core/pdf/pdf.service';

@Component({
  selector: 'app-home',
  standalone: false,
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(public auth: AuthService, private pdf: PdfService) {}

  // existentes
  plantilla = 'prueba';
  asegurado = 'Juan_Perez_12345';
  nombreCompletoRazonSocial = 'JUAN PÉREZ S.A.';

  // NUEVOS
  fecha = new Date().toISOString().slice(0, 10); // yyyy-mm-dd
  gastos: Array<{ descripcion: string; presentado: string; elegible: string }> = [
    { descripcion: '', presentado: '', elegible: '' }
  ];

  loading = false;
  errorMsg = '';
  result: GenerateResponse | null = null;

  addGasto() {
    this.gastos.push({ descripcion: '', presentado: '', elegible: '' });
  }

  removeGasto(i: number) {
    this.gastos.splice(i, 1);
  }

  generar() {
    this.loading = true;
    this.errorMsg = '';
    this.result = null;

    this.pdf.generate({
      plantilla: this.plantilla,
      asegurado: this.asegurado,
      nombreCompletoRazonSocial: this.nombreCompletoRazonSocial,
      fecha: this.fecha,
      gastos: this.gastos
    } as any).subscribe({
      next: (res) => { this.result = res; this.loading = false; },
      error: (err) => {
        this.errorMsg = err?.message || err?.error?.message || 'Error al generar el documento';
        this.loading = false;
      }
    });
  }
}