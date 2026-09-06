import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Inbox } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface ReportTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  keyExtractor?: (row: T, index: number) => string;
}

export function ReportTable<T>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = 'Nenhum dado encontrado para os filtros selecionados.',
  keyExtractor = (_, idx) => String(idx),
}: ReportTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIndex, startIndex + pageSize);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200/80 bg-white p-12 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500 mb-3">
          <Inbox size={26} />
        </div>
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Nenhum registro encontrado
        </h3>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
          {emptyMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="overflow-x-auto min-w-full scrollbar-thin">
        <table className="min-w-full divide-y divide-neutral-200 text-left text-xs dark:divide-neutral-800">
          <thead className="bg-neutral-50/75 dark:bg-neutral-800/50">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  scope="col"
                  className={`px-4 py-3.5 font-semibold text-neutral-600 dark:text-neutral-300 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 bg-white dark:bg-neutral-900">
            {currentData.map((row, rowIdx) => (
              <tr
                key={keyExtractor(row, startIndex + rowIdx)}
                className="transition-colors hover:bg-neutral-50/60 dark:hover:bg-neutral-800/30"
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`whitespace-nowrap px-4 py-3 text-neutral-700 dark:text-neutral-300 ${col.className || ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : col.accessor
                      ? String(row[col.accessor] ?? '-')
                      : '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
          <div>
            Mostrando <span className="font-medium text-neutral-700 dark:text-neutral-200">{startIndex + 1}</span> a{' '}
            <span className="font-medium text-neutral-700 dark:text-neutral-200">
              {Math.min(startIndex + pageSize, data.length)}
            </span>{' '}
            de <span className="font-medium text-neutral-700 dark:text-neutral-200">{data.length}</span> registros
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 font-medium text-neutral-700 dark:text-neutral-200">
              {currentPage} de {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
