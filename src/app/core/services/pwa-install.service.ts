import { Injectable } from '@angular/core'; //così tratta la classe come services

@Injectable({ //singleton dice ad Angulardi creare un'unica istanza di questo servizio (disponibile in tutta l'applicazione)
    providedIn: 'root'
})

export class PwaInstallService {

    private deferredPrompt: any;

    isAppInstalled(): boolean {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIosStandlone = (window.navigator as any).standalone === true;
        return isStandalone || isIosStandlone;
    }

    private readonly STORAGE_KEY = 'pwa-install-dismissed'; //valore salvato in localStorage

    registerPrompt(event: any) {
        event.preventDefault(); //previene il browser di mostrare il prompt di installazione
        this.deferredPrompt = event; //salvo l'evento per poterlo usare in seguito
    }

    canShowInstallDialog(): boolean {

        if (this.isAppInstalled()) {
            return false;
        }

        if (!this.deferredPrompt) {
            return false;
        }

        const dismissed = Number(localStorage.getItem(this.STORAGE_KEY));

        if (!dismissed) {
            return true;
        }

        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        return Date.now() - dismissed > oneWeek;
    }


    async install(): Promise<boolean> {
        if (!this.deferredPrompt) {
            return false;
        }

        this.deferredPrompt.prompt();

        const result = await this.deferredPrompt.userChoice;

        this.deferredPrompt = null;

        return result.outcome === 'accepted';
    }

    dismissForOneWeek(): void {

        localStorage.setItem(
            this.STORAGE_KEY,
            Date.now().toString()
        );

    }

}