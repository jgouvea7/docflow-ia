import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, throwError, timeout } from 'rxjs';

import { environment } from '../../environments/environment';
import { toApiError } from '../core/errors/api-error';
import { JobSummary } from '../models/document.model';

const REQUEST_TIMEOUT_MS = 20_000;

@Injectable({ providedIn: 'root' })
export class JobService {
  private readonly http = inject(HttpClient);
  private readonly jobsUrl = `${environment.apiUrl}/jobs`;

  listMyJobs(): Observable<JobSummary[]> {
    return this.http.get<JobSummary[]>(this.jobsUrl).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }

  getJobById(jobId: string): Observable<JobSummary> {
    return this.http.get<JobSummary>(`${this.jobsUrl}/${jobId}`).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }

  deleteJob(jobId: string): Observable<void> {
    return this.http.delete<void>(`${this.jobsUrl}/${jobId}`).pipe(
      timeout(REQUEST_TIMEOUT_MS),
      catchError((error) => throwError(() => toApiError(error)))
    );
  }
}
