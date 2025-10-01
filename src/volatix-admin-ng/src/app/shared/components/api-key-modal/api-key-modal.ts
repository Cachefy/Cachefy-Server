import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ApiKeyDisplayData {
  agentName: string;
  apiKey: string;
  keyId: string;
  generatedAt: string;
  isNewKey?: boolean;
}

@Component({
  selector: 'app-api-key-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './api-key-modal.html',
  styleUrl: './api-key-modal.css',
})
export class ApiKeyModal {
  // Inputs
  isOpen = input<boolean>(false);
  keyData = input<ApiKeyDisplayData | null>(null);

  // Outputs
  close = output<void>();
  copyKey = output<string>();

  // Internal state
  copied = signal(false);

  onClose() {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  async copyApiKey() {
    const key = this.keyData()?.apiKey;
    if (key) {
      try {
        await navigator.clipboard.writeText(key);
        this.copied.set(true);
        this.copyKey.emit(key);

        // Reset copied state after 2 seconds
        setTimeout(() => {
          this.copied.set(false);
        }, 2000);
      } catch (error) {
        console.error('Failed to copy API key:', error);
      }
    }
  }

  downloadAsJson() {
    const data = this.keyData();
    if (data) {
      const jsonContent = {
        agentName: data.agentName,
        apiKey: data.apiKey,
        keyId: data.keyId,
        generatedAt: data.generatedAt,
        downloadedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.agentName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-api-key.json`;
      link.click();
      window.URL.revokeObjectURL(url);
    }
  }
}
