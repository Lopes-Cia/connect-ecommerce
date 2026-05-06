import { MapPinCheck, ChevronRight, Phone } from "lucide-react";

export default function CepHeader() {
  return (
    <div className="w-full shadow-[0_2px_4px_0px_rgba(0,0,0,0.1)] xs:px-4 sm:px-6 md:px-8 2xl:px-0">
      <div className="max-w-[var(--width-content-md)] lg:max-w-[var(--width-content-lg)] mx-auto flex justify-between items-center h-9 bg-white">
        <div className="flex items-center">
          <MapPinCheck className="text-tints-french-blue" size={18} />
          <button className="ml-2 text-tints-french-blue font-montserrat font-normal text-sm hover:underline cursor-pointer">
            Confira o estoque da sua região{" "}
            <ChevronRight className="inline-block ml-1" size={16} />
          </button>
        </div>
        <div className="flex items-center min-[50px]:max-sm:hidden">
          <Phone className="text-tints-french-blue" size={18} />
          <button className="ml-2 text-tints-french-blue font-montserrat font-normal text-sm hover:underline cursor-pointer">
            Atendimento: (41) 9 8445-1128
          </button>
        </div>
      </div>
    </div>
  );
}
