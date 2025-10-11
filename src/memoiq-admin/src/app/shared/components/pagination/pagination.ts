import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [],
  templateUrl: './pagination.html',
  styleUrl: './pagination.css',
})
export class Pagination {
  currentPage = input<number>(1);
  totalPages = input<number>(1);
  pageInfo = input<string>('');

  pageChange = output<number>();
  prevClick = output<void>();
  nextClick = output<void>();

  onPrevClick() {
    if (this.currentPage() > 1) {
      this.prevClick.emit();
    }
  }

  onNextClick() {
    if (this.currentPage() < this.totalPages()) {
      this.nextClick.emit();
    }
  }

  onPageClick(page: number) {
    this.pageChange.emit(page);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  }
}
