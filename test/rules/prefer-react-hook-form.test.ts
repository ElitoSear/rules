import rule from "../../src/rules/prefer-react-hook-form.ts";
import { ruleTester } from "../rule-tester.ts";

function error(name: string) {
  return [{ messageId: "preferReactHookForm" as const, data: { name } }];
}

ruleTester.run("prefer-react-hook-form", rule, {
  valid: [
    "function C() { const [open, setOpen] = useState(false); return <Dialog open={open} />; }",
    "function C() { const { register } = useForm(); return <input {...register('name')} />; }",
    "function C() { const value = useMemo(() => 1, []); return <input value={value} />; }",
    "function C() { const [name] = useState(''); return <input defaultValue={name} />; }",
    "const [name] = useState(''); function C(name) { return <input value={name} />; }",
    "function C() { const [name, setName] = useState(''); return <input value={other} />; }",
  ],
  invalid: [
    {
      code: "function C() { const [name, setName] = useState(''); return <input value={name} onChange={(event) => setName(event.target.value)} />; }",
      errors: error("name"),
    },
    {
      code: "function C() { const [done] = useState(false); return <input type='checkbox' checked={done} />; }",
      errors: error("done"),
    },
    {
      code: "function C() { const [picked] = useState(false); return <option selected={picked} />; }",
      errors: error("picked"),
    },
    {
      code: "function C() { const state = useState(''); return <input value={state} />; }",
      errors: error("state"),
    },
    {
      code: "function C() { const [form] = useState({ email: '' }); return <><input value={form.email} /><input value={form?.name} /></>; }",
      errors: error("form"),
    },
    {
      code: "function C() { const [name] = React.useState<string>(''); return <Input value={name ?? ''} />; }",
      errors: error("name"),
    },
    {
      code: "import { useState as useLocal } from 'react'; function C() { const [name] = useLocal(''); return <input value={name as string} />; }",
      errors: error("name"),
    },
  ],
});
