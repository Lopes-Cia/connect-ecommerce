import { Search } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="flex items-center max-h-8 bg-white relative w-full max-w-160 rounded-xs">
      <input
        type="text"
        placeholder="Pesquise em toda a loja"
        className="font-montserrat font-medium text-[0.85em] text-black/90 w-full max-h-[2.3rem] pl-10 pr-4 py-2 outline-none border-none"
      />
      <Search
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
        size={18}
      />
    </div>
  );
}
