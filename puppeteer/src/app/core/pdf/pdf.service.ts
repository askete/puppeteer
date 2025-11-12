import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface GeneratePayload {
  plantilla: string;
  asegurado: string;
  nombreCompletoRazonSocial: string;
}

export interface GenerateResponse {
  pdfUrl: string;
  htmlUrl: string;
  reason?: string | null;
}

// <<< pon aquí tu endpoint >>>
const BASE_URL = 'https://g9uv77z76f.execute-api.eu-west-1.amazonaws.com/pre'; 
// si tu recurso en API GW es /html2pdf, usa: `${BASE_URL}/html2pdf`

@Injectable({ providedIn: 'root' })
export class PdfService {
  constructor(private http: HttpClient) {}

  /** Llama a la Lambda y devuelve un Observable con { pdfUrl, htmlUrl } */
  generate(payload: GeneratePayload): Observable<GenerateResponse> {
    const url = `${BASE_URL}`; // o `${BASE_URL}/html2pdf`
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    const body = {
      html: '',
      pdfOptions: null,
      datos: payload
    };

    return this.http.post<any>(url, body, { headers }).pipe(
      map((raw) => {
        // Puede venir directo {pdfUrl, htmlUrl} o envuelto {statusCode, body}
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
}
