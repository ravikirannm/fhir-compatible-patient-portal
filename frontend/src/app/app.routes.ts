import { Routes } from '@angular/router';
import { LoginComponent } from './components/login.component';
import { PatientListComponent } from './components/patient-list.component';
import { PatientDetailComponent } from './components/patient-detail.component';
import { ResourceBrowserComponent } from './components/resource-browser.component';
import { NLQueryComponent } from './components/nl-query.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'patients', component: PatientListComponent, canActivate: [authGuard] },
  { path: 'patient/:id', component: PatientDetailComponent, canActivate: [authGuard] },
  { path: 'fhir-browser', component: ResourceBrowserComponent, canActivate: [authGuard] },
  { path: 'nl-query', component: NLQueryComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '/patients' },
];
