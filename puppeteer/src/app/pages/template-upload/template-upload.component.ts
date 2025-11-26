// src/app/pages/template-upload/template-upload.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { PdfService } from '../../core/pdf/pdf.service';

@Component({
  selector: 'app-template-upload',
  standalone: false,
  templateUrl: './template-upload.component.html',
  styleUrls: ['./template-upload.component.scss'],
})
export class TemplateUploadComponent {
  templateId = '';
  title = '';
  description = '';

  mainHtml: string | null = null;
  headerHtml: string | null = null;
  footerHtml: string | null = null;

  showNombre = true;
  showFecha = true;
  showGuidelines = false;

  loading = false;
  errorMsg = '';
  okMsg = '';

  constructor(
    private auth: AuthService,
    private pdf: PdfService
  ) {}

  // Helper para leer un fichero como texto
  private readFileAsText(
    event: Event,
    assign: (content: string | null) => void
  ) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      assign(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      assign(reader.result as string);
    };

    reader.onerror = () => {
      console.error('Error leyendo archivo', reader.error);
      assign(null);
      this.errorMsg = 'Error leyendo el archivo seleccionado.';
    };

    reader.readAsText(file);
  }

  onMainFileChange(event: Event) {
    this.readFileAsText(event, (c) => (this.mainHtml = c));
  }

  onHeaderFileChange(event: Event) {
    this.readFileAsText(event, (c) => (this.headerHtml = c));
  }

  onFooterFileChange(event: Event) {
    this.readFileAsText(event, (c) => (this.footerHtml = c));
  }

  onSubmit() {
    this.errorMsg = '';
    this.okMsg = '';

    const user = this.auth.currentUser;
    if (!user) {
      this.errorMsg = 'No hay usuario autenticado. Vuelve a iniciar sesión.';
      return;
    }

    if (!this.templateId.trim()) {
      this.errorMsg = 'El ID de la plantilla es obligatorio.';
      return;
    }

    if (!this.title.trim()) {
      this.errorMsg = 'El título es obligatorio.';
      return;
    }

    if (!this.mainHtml) {
      this.errorMsg = 'Debes seleccionar el HTML principal de la plantilla.';
      return;
    }

    this.loading = true;

    this.pdf
      .uploadTemplate({
        userId: user.uid,
        templateId: this.templateId.trim(),
        title: this.title.trim(),
        description: this.description || '',
        html: this.mainHtml,
        headerHtml: this.headerHtml || undefined,
        footerHtml: this.footerHtml || undefined,
        showNombre: this.showNombre,
        showFecha: this.showFecha,
      })
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          this.okMsg =
            res?.message || 'Plantilla subida correctamente.';
        },
        error: (err) => {
          this.loading = false;
          this.errorMsg =
            err?.error?.message ||
            err?.message ||
            'Error subiendo la plantilla.';
        },
      });
  }
}
