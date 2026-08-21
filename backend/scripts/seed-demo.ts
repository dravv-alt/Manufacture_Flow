import { queryClient } from "../src/lib/db/client";
import { resetDemoScenario } from "../src/lib/demo/service";

resetDemoScenario("golden").then((result) => console.log(`Demo seed complete in ${result.safety.databaseName}.`)).catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => queryClient.end({ timeout: 5 }));
