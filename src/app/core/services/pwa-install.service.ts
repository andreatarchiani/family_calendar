import { Injectable } from '@angular/core';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({
    providedIn: 'root'
})
export class PwaInstallService {
    private deferredPrompt: BeforeInstallPromptEvent | null = null;

    isAppInstalled(): boolean {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        return isStandalone || isIosStandalone;
    }

    isIosDevice(): boolean {
        return /iPad|iPhone|iPod/.test(navigator.userAgent)
            || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    }

    registerPrompt(event: Event): void {
        event.preventDefault();
        this.deferredPrompt = event as BeforeInstallPromptEvent;
    }

    canInstallNatively(): boolean {
        return !!this.deferredPrompt && !this.isAppInstalled();
    }

    async install(): Promise<boolean> {
        if (!this.deferredPrompt || this.isAppInstalled()) {
            return false;
        }

        const promptEvent = this.deferredPrompt;
        this.deferredPrompt = null;

        await promptEvent.prompt();
        const result = await promptEvent.userChoice;
        return result.outcome === 'accepted';
    }
}
