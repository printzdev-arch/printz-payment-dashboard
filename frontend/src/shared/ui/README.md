# DataTable wrapper

This folder contains a reusable `DataTable` component based on `react-data-table-component`.

Usage example:

```jsx
import DataTable from "../common/DataTable";

const columns = [
  { name: "Name", selector: (row) => row.name, sortable: true },
  { name: "Actions", cell: (row) => <button>Edit</button> },
];

<DataTable
  columns={columns}
  data={rows}
  loading={isLoading}
  noDataText="No rows"
  pagination
/>;
```

Notes

- Sorting and pagination are client-side by default.
- Customize per-page options via `paginationRowsPerPageOptions`.
- Provide `progressComponent` or `noDataComponent` via props to override defaults.
