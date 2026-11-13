const { MongoMemoryReplSet } = require("mongodb-memory-server");
const { spawn } = require("child_process");
(async () => {
  const rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const code = `
require('./src/config/env'); const m=require('mongoose'); require('./src/utils/softDelete/softDeletePlugin').registerSoftDelete();
(async()=>{ console.log('A'); await require('./src/config/database')(); console.log('B'); require('./src/modules/models'); console.log('C');
 await m.model('User').create({ name:'Admin', username:'admin', email:'admin@example.com', password:'ChangeMe@12345', role:'admin', permissions:['*'], isActive:true }); console.log('admin created'); process.exit(0); })().catch(e=>{ console.error('ERR', e.message); process.exit(1); })`;
  const p = spawn("node", ["-e", code], { env: { ...process.env, MONGODB_URI: rs.getUri("readme") } });
  p.stdout.on("data", (d) => process.stdout.write("O:" + d)); p.stderr.on("data", (d) => process.stdout.write("E:" + d));
  setTimeout(() => { p.kill(); process.exit(0); }, 40000);
  p.on("exit", () => process.exit(0));
})();
