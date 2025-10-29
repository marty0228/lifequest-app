// src/components/ui/input.tsx

interface InputProps {
  id: string; // id를 명시적으로 받도록 설정
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}

export const Input = ({ id, value, onChange, placeholder }: InputProps) => {
  return (
    <input
      id={id}  // id를 설정
      value={value} 
      onChange={onChange}
      placeholder={placeholder}
      className="border rounded-md px-3 py-2"
    />
  );
};