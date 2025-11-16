// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { LoginComponent } from './pages/login/login.component';
import { HomeComponent } from './pages/home/home.component';
import { ReactiveFormsModule } from '@angular/forms';  // 👈 IMPORTANTE

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,   // 👈 aquí (no standalone)
    HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,  HttpClientModule,  // <—
    FormsModule,
    ReactiveFormsModule,  
    
  ],
  providers: [
    provideFirebaseApp(() =>
      initializeApp({
        apiKey: 'AIzaSyBit1LQk-zz0Nl5qvBdjaFuZ3htb7Q1aDc',
        authDomain: 'puppeteer-56db7.firebaseapp.com',
        projectId: 'puppeteer-56db7',
        storageBucket: 'puppeteer-56db7.firebasestorage.app',
        messagingSenderId: '41433761153',
        appId: '1:41433761153:web:7b30a88a8f625c127e1480',
        measurementId: 'G-KCX7KL51V9'
      })
    ),
    provideAuth(() => getAuth()),
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
