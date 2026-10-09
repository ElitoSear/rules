import rule from "../../src/rules/prefer-tanstack-query.ts";
import { ruleTester } from "../rule-tester.ts";

const error = [{ messageId: "preferTanstackQuery" as const }];

ruleTester.run("prefer-tanstack-query", rule, {
  valid: [
    "useEffect(() => { fetch('/api'); }, []);",
    "useEffect(() => { const asyncMode = true; record.get('a'); }, []);",
    "useEffect(() => { async function run() { await sleep(1); } run(); }, []);",
    "useQuery({ queryKey: ['a'], queryFn: async () => fetch('/a') });",
    "const load = async () => fetch('/a');",
    "import { useEffect as other } from 'x'; other(async () => { await fetch('/a'); });",
    {
      code: "useEffect(() => { axios.request('/a').then(setData); }, []);",
      options: [{ requestClients: ["http"] }],
    },
  ],
  invalid: [
    {
      code: "useEffect(() => { const run = async () => { await fetch('/api'); }; run(); }, []);",
      errors: error,
    },
    { code: "useEffect(() => { fetch('/api').then(setData); }, []);", errors: error },
    {
      code: "useEffect(() => { async function load() { const { data } = await supabase.from('t').select(); } load(); }, []);",
      errors: error,
    },
    { code: "useEffect(() => { axios.get('/a').then(setData); }, []);", errors: error },
    { code: "React.useEffect(() => { client.post('/a').then(done); });", errors: error },
    {
      code: "import { useEffect as runEffect } from 'react'; runEffect(() => { async function load() { await api.get('/a'); } load(); }, []);",
      errors: error,
    },
    {
      code: "useEffect(() => { useEffect(() => {}); fetch('/a').then(setA); }, []);",
      errors: error,
    },
    {
      code: "useEffect(() => { http.request('/a').then(setData); }, []);",
      options: [{ requestClients: ["http"] }],
      errors: error,
    },
    {
      code: "useEffect(() => { api.query('/a').then(setData); }, []);",
      options: [{ requestMethods: ["query"] }],
      errors: error,
    },
    {
      code: "useEffect(() => { request('/a').then(setData); }, []);",
      options: [{ requestFunctions: ["request"] }],
      errors: error,
    },
  ],
});
