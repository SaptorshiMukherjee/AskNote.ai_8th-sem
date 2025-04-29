import { Moon, Sun, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/use-theme';

const Navbar = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="border-b border-blue-100 py-4 px-6 bg-gradient-to-r from-blue-50 to-white
                    dark:from-blue-950 dark:to-gray-950 dark:border-blue-900">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors
                        dark:bg-blue-500/20 dark:group-hover:bg-blue-500/30">
            <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-xl font-semibold text-blue-900 dark:text-white">AskNotes.AI</span>
        </Link>
        <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
          Turning documents into conversations
        </div>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleTheme}
          className="rounded-full hover:bg-blue-100/50 dark:hover:bg-blue-900/50"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Moon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          )}
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
