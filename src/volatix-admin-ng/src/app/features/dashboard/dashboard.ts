import { Component, inject, OnInit, signal } from '@angular/core';
import { DataService } from '../../core/services/data';
import { NotificationService } from '../../core/services/notification.service';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private dataService = inject(DataService);
  private notificationService = inject(NotificationService);

  metrics = signal({
    activeCaches: 0,
    totalItems: 0,
    hitRatio: '0%',
  });

  logs = signal<string[]>([]);

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Load services and caches to compute metrics
    this.dataService.getServices().subscribe(() => {
      this.dataService.getCaches().subscribe(() => {
        this.updateMetrics();
      });
    });

    // Get logs
    this.logs.set(this.dataService.getLogs());
  }

  updateMetrics() {
    const newMetrics = this.dataService.getDashboardMetrics();
    this.metrics.set(newMetrics);
  }

  // Demo methods for testing notifications
  testSuccessNotification() {
    this.notificationService.showCreateSuccess('Test Service');
  }

  testErrorNotification() {
    this.notificationService.showCreateError('Test Service', 'Connection timeout occurred');
  }

  testWarningNotification() {
    this.notificationService.showWarning(
      'System Warning',
      'Cache memory usage is above 80%',
      'Warning'
    );
  }

  testInfoNotification() {
    this.notificationService.showInfo(
      'System Info',
      'Maintenance window scheduled for tomorrow at 2 AM',
      'Info'
    );
  }
}
