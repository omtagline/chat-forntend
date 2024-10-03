import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    {
        path:'',
        loadComponent:()=>import('./features/auth/login/login.component').then(c=>c.LoginComponent),
        canActivate:[authGuard]
    },
    {
        path:'chat',
        loadComponent:()=>import('./features/chat/chat.component').then(c=>c.ChatComponent),
    }
];
