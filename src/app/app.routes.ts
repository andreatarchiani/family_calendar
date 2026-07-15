import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () =>
            import('./features/auth/login/login')
                .then(m => m.Login)
    },

    {
        path: '',
        loadComponent: () =>
            import('./layout/main-layout/main-layout')
                .then(m => m.MainLayout),
        children: [
            {
                path: 'home',
                loadComponent: () =>
                    import('./features/home/home')
                        .then(m => m.Home)
            },
            {
                path: 'calendar',
                loadComponent: () =>
                    import('./features/calendar/calendar')
                        .then(m => m.Calendar)
            },
            {
                path: 'events',
                loadComponent: () =>
                    import('./features/events/events')
                        .then(m => m.Events)
            }
        ]
    },

    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    }
];