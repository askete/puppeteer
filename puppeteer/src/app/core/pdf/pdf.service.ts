// src/app/core/pdf/pdf.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';

export interface Gasto {
  descripcion: string;
  presentado: string;
  elegible: string;
}

export interface GeneratePayload {
  plantilla: string;
  asegurado: string;
  nombreCompletoRazonSocial: string;
  fecha: string;
  gastos: Gasto[];
  userId: string;
}

export interface GenerateResponse {
  pdfUrl: string;
  htmlUrl: string;
  reason?: string | null;
}

const BASE_URL = 'https://g9uv77z76f.execute-api.eu-west-1.amazonaws.com/pre';

@Injectable({ providedIn: 'root' })
export class PdfService {
  constructor(private http: HttpClient) { }

  generate(payload: GeneratePayload): Observable<GenerateResponse> {
    const url = `${BASE_URL}`;
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    const body = {
      html: '',
      pdfOptions: null,
      datos: payload
    };

    return this.http.post<any>(url, body, { headers }).pipe(
      map((raw) => {
        let parsed = raw;

        if (!parsed?.pdfUrl && raw?.body) {
          try {
            parsed = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
          } catch {
            throw new Error('No se pudo parsear la respuesta del API Gateway');
          }
        }

        if (!parsed?.pdfUrl || !parsed?.htmlUrl) {
          const reason = parsed?.reason || 'Respuesta sin URLs';
          throw new Error(`No se devolvieron URLs. Motivo: ${reason}`);
        }

        return {
          pdfUrl: parsed.pdfUrl as string,
          htmlUrl: parsed.htmlUrl as string,
          reason: parsed.reason ?? null
        } as GenerateResponse;
      })
    );
  }

  // 🔹 DEVUELVE DIRECTAMENTE EL ARRAY DE TEMPLATES
  getTemplatesForUser(userId: string): Observable<any[]> {
  return this.http
    .get<any>(`${BASE_URL}/teamplates`, {
      params: { userId }
    })
    .pipe(
      tap((raw) => {
        console.log('RAW respuesta /teamplates:', raw); // 👈 para ver EXACTO qué llega
      }),
      map((raw: any) => {
        // Caso 1: ya viene como { templates: [...] }
        if (raw && raw.templates) {
          return raw.templates;
        }

        // Caso 2: viene como { statusCode, body: '...json...' }
        if (raw && raw.body) {
          try {
            const inner =
              typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
            return inner.templates ?? [];
          } catch (e) {
            console.error('Error parseando raw.body de /teamplates', e, raw);
            return [];
          }
        }

        // Caso 3: viene directamente como string '{"templates":[...]}'
        if (typeof raw === 'string') {
          try {
            const inner = JSON.parse(raw);
            return inner.templates ?? [];
          } catch (e) {
            console.error('Error parseando string /teamplates', e, raw);
            return [];
          }
        }

        // Si llega algo raro, devolvemos array vacío
        return [];
      })
    );
}

 getTemplateVariables(
  userId: string,
  templateId: string
): Observable<{ templateId: string; variables: { name: string; type: string }[] }> {
  return this.http
    .get<any>(`${BASE_URL}/teamplates/variables`, {
      params: { userId, templateId }   // 👈 templateId ahora va en la query
    })
    .pipe(
      map((raw) => {
        let parsed = raw;

        if (!parsed?.variables && raw?.body) {
          try {
            parsed =
              typeof raw.body === 'string'
                ? JSON.parse(raw.body)
                : raw.body;
          } catch {
            throw new Error(
              'No se pudo parsear la respuesta de /teamplates/variables'
            );
          }
        }

        return {
          templateId: parsed.templateId,
          variables: parsed.variables ?? []
        };
      })
    );
}


  // src/app/core/pdf/pdf.service.ts
  uploadTemplate(payload: {
    userId: string;
    templateId: string;
    title: string;
    description: string;
    html: string;
    headerHtml?: string;
    footerHtml?: string;
    showNombre?: boolean;
    showFecha?: boolean;
  }) {
    return this.http.post(`${BASE_URL}/teamplates`, payload);
  }



}
