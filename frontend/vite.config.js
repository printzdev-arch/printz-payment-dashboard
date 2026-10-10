import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

/**
 * Custom Vite Plugin to sync in-browser mock entries directly into physical .sample.js files
 */
function devSampleDataSyncPlugin() {
  return {
    name: 'dev-sample-data-sync-plugin',
    configureServer(server) {
      server.middlewares.use('/__dev-sync-sample', (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body || '{}');
            const { allCollections } = payload;
            const sampleDataDir = path.resolve(__dirname, 'src/mock/sampleData');

            const writeSampleFile = (filePath, headerComment, exportVar, value) => {
              const code = `${headerComment}\n\nexport const ${exportVar} = ${JSON.stringify(value, null, 2)};\n`;
              fs.writeFileSync(filePath, code, 'utf-8');
            };

            if (allCollections) {
              if (allCollections.customers) {
                writeSampleFile(
                  path.join(sampleDataDir, 'customers.sample.js'),
                  '/**\n * PrintZ Sample Data - Customers (Step 1 Customer Registration Foundation)\n */',
                  'sampleCustomers',
                  allCollections.customers
                );
              }
              if (allCollections.jobs) {
                writeSampleFile(
                  path.join(sampleDataDir, 'jobs.sample.js'),
                  '/**\n * PrintZ Sample Data - Job Orders & Requirement Specifications (Step 2)\n */',
                  'sampleJobs',
                  allCollections.jobs
                );
              }
              if (allCollections.estimates) {
                writeSampleFile(
                  path.join(sampleDataDir, 'estimates.sample.js'),
                  '/**\n * PrintZ Sample Data - Estimates & Quotations (Step 3)\n */',
                  'sampleEstimates',
                  allCollections.estimates
                );
              }
              if (allCollections.designAssignments) {
                writeSampleFile(
                  path.join(sampleDataDir, 'designAssignments.sample.js'),
                  '/**\n * PrintZ Sample Data - Design Assignments & Proof Approval (Step 5 & 6)\n */',
                  'sampleDesignAssignments',
                  allCollections.designAssignments
                );
              }
              if (allCollections.posProducts || allCollections.posCategories) {
                const prodCode = `/**\n * PrintZ Sample Data - POS Products & Categories (Step 7)\n */\n\nexport const samplePosCategories = ${JSON.stringify(allCollections.posCategories || [], null, 2)};\n\nexport const samplePosProducts = ${JSON.stringify(allCollections.posProducts || [], null, 2)};\n`;
                fs.writeFileSync(path.join(sampleDataDir, 'posProducts.sample.js'), prodCode, 'utf-8');
              }
              if (allCollections.sales || allCollections.invoices || allCollections.saleReceipts || allCollections.heldBills || allCollections.returns) {
                const salesCode = `/**\n * PrintZ Sample Data - Sales & POS Transactions (Step 7)\n */\n\nexport const sampleSales = ${JSON.stringify(allCollections.sales || [], null, 2)};\n\nexport const sampleInvoices = ${JSON.stringify(allCollections.invoices || [], null, 2)};\n\nexport const sampleReceipts = ${JSON.stringify(allCollections.saleReceipts || [], null, 2)};\n\nexport const sampleHeldBills = ${JSON.stringify(allCollections.heldBills || [], null, 2)};\n\nexport const sampleReturns = ${JSON.stringify(allCollections.returns || [], null, 2)};\n`;
                fs.writeFileSync(path.join(sampleDataDir, 'sales.sample.js'), salesCode, 'utf-8');
              }
              if (allCollections.productionOrders || allCollections.eligibleJobsForPlanning || allCollections.productionMachines) {
                const prodCode = `/**\n * PrintZ Sample Data - Production Planning & Orders (Step 8 & 9)\n */\n\nexport const sampleMachines = ${JSON.stringify(allCollections.productionMachines || [], null, 2)};\n\nexport const sampleEligibleJobsForPlanning = ${JSON.stringify(allCollections.eligibleJobsForPlanning || [], null, 2)};\n\nexport const sampleProductionOrders = ${JSON.stringify(allCollections.productionOrders || [], null, 2)};\n`;
                fs.writeFileSync(path.join(sampleDataDir, 'production.sample.js'), prodCode, 'utf-8');
              }
              if (allCollections.qualityChecks || allCollections.reprintRequests || allCollections.qcChecklistTemplate || allCollections.defectCatalogue) {
                const qcCode = `/**\n * PrintZ Sample Data - Quality Control & Rework / Reprint (Step 10)\n */\n\nexport const defaultQcChecklistTemplate = ${JSON.stringify(allCollections.qcChecklistTemplate || [], null, 2)};\n\nexport const sampleDefectCatalogue = ${JSON.stringify(allCollections.defectCatalogue || [], null, 2)};\n\nexport const sampleQualityChecks = ${JSON.stringify(allCollections.qualityChecks || [], null, 2)};\n\nexport const sampleReprintRequests = ${JSON.stringify(allCollections.reprintRequests || [], null, 2)};\n`;
                fs.writeFileSync(path.join(sampleDataDir, 'quality.sample.js'), qcCode, 'utf-8');
              }
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, message: 'Sample files updated on disk' }));
          } catch (err) {
            console.error('[Dev Sample Sync Error]:', err);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
      });
    }
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      include: 'src/**/*.{jsx,js}',
    }),
    devSampleDataSyncPlugin(),
  ],
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.[jt]sx?$/,
    exclude: [/node_modules/],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
        '.jsx': 'jsx',
      },
    },
  },
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.mjs', '.mts', '.json'],
  },
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      ignored: ['**/src/mock/sampleData/**'],
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-icons': ['lucide-react', 'react-icons'],
        },
      },
    },
  },
  define: {
    'process.env': {},
  },
});
