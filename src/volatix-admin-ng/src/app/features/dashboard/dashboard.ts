import { Component, inject, OnInit, signal } from '@angular/core';
import { DataService } from '../../core/services/data';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private dataService = inject(DataService);

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
}
