import { spawn } from "node:child_process";
import net from "node:net";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const serverDir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: fileURLToPath(new URL("./.env", import.meta.url)), override: true });

const port = Number(process.env.PORT || 5000);
const apiUrl = `http://127.0.0.1:${port}/api/health`;

async function checkExistingApi() {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(1200) });
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.ok === true) {
      console.log(`ByteBud API is already running on port ${port} and connected to MongoDB.`);
      console.log("Reusing the existing API; stop its original terminal when you want to restart it.");
      return "healthy";
    }
    if (data.database) {
      console.error(`ByteBud API is using port ${port}, but its MongoDB connection is not ready. Check Atlas access and the backend logs.`);
    } else {
      console.error(`Port ${port} is responding, but it is not the ByteBud API. Stop the process using that port or change PORT in server/.env.`);
    }
    return "occupied";
  } catch {
    return "unreachable";
  }
}

function canBindPort() {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", (error) => resolve(error.code !== "EADDRINUSE"));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}

const existing = await checkExistingApi();
if (existing === "healthy") process.exit(0);
if (existing === "occupied") process.exit(1);
if (!(await canBindPort())) {
  console.error(`Port ${port} is already in use. Stop the other server or change PORT in server/.env.`);
  console.error(`To find the process in PowerShell: Get-NetTCPConnection -LocalPort ${port} -State Listen`);
  process.exit(1);
}

const child = spawn(process.execPath, ["--watch", "server.js"], {
  cwd: serverDir,
  stdio: ["inherit", "pipe", "pipe"],
});
let stopping = false;
let portConflict = false;

function forwardLines(stream, destination) {
  let pending = "";
  stream.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() || "";
    for (const line of lines) {
      if (line.includes("EADDRINUSE")) {
        if (!portConflict) {
          portConflict = true;
          console.error(`Port ${port} became occupied while the API was starting. Stop the other server and run npm run dev again.`);
          child.kill();
        }
        continue;
      }
      if (!portConflict) destination.write(`${line}\n`);
    }
  });
  stream.on("end", () => {
    if (pending && !portConflict) destination.write(pending);
  });
}

forwardLines(child.stdout, process.stdout);
forwardLines(child.stderr, process.stderr);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    child.kill(signal);
  });
}

child.on("error", (error) => {
  console.error(`Could not start the API: ${error.message}`);
  process.exitCode = 1;
});
child.on("close", (code) => {
  if (portConflict) process.exitCode = 1;
  else if (!stopping) process.exitCode = code || 0;
});
