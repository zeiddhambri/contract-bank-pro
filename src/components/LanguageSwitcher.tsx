
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Languages } from "lucide-react";
import { useEffect } from "react";

const languages = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ar", name: "العربية", flag: "🇹🇳" },
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = i18n.dir(i18n.language);
  }, [i18n, i18n.language]);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">Changer la langue</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="border-slate-200 bg-white shadow-md"
      >
        {languages.map((lang) => (
          <DropdownMenuItem 
            key={lang.code} 
            onClick={() => changeLanguage(lang.code)}
            className={`text-slate-700 hover:bg-slate-100 focus:bg-slate-100 cursor-pointer ${
              i18n.language === lang.code ? 'bg-orange-600/20 text-orange-400' : ''
            }`}
          >
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
            {i18n.language === lang.code && (
              <span className="ml-auto text-orange-400">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
