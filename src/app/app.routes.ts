import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';


export const routes: Routes = [

    // Branded Firebase email action handler (verification and password reset).
    {
        path: 'auth',
        children: [
            {
                path: 'action',
                loadComponent: () =>
                    import('./features/auth/login/login')
                        .then(m => m.Login)
            }
        ]
    },

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

        canActivate: [authGuard],

        children: [

            {
                path: '',
                redirectTo: 'home',
                pathMatch: 'full'
            },

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
            },

            {
                path: 'events/new',
                loadComponent: () =>
                    import('./features/events/pages/new-event/new-event')
                        .then(m => m.NewEvent)
            },

            {
                path: 'friends',
                loadComponent: () =>
                    import('./features/friends/friends')
                        .then(m => m.Friends)
            }

        ]


    },

    {
        path: '**',
        redirectTo: 'home'
    }

];