import React, { useState } from 'react';
import { ChefHat, Search, Loader2, Utensils, X } from 'lucide-react';

interface DinnerRecommendationProps {
    onClose: () => void;
}

export const DinnerRecommendation: React.FC<DinnerRecommendationProps> = ({ onClose }) => {
    const [ingredients, setIngredients] = useState('');
    const [recipes, setRecipes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const searchRecipes = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ingredients.trim()) return;

        setIsLoading(true);
        setError(null);
        setRecipes([]);

        try {
            // Split by comma, trim, join
            const query = ingredients.split(',').map(i => i.trim()).filter(Boolean).join(',');
            const res = await fetch(`/api/dinner?ingredients=${encodeURIComponent(query)}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch recipes');
            }

            setRecipes(data.results || []);
            if (data.results?.length === 0) {
                setError("No recipes found for those ingredients.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-orange-50/50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-900/40 p-2 rounded-xl text-orange-600 dark:text-orange-400">
                            <ChefHat size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Today's Dinner</h2>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Enter ingredients to get recipe ideas</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    <form onSubmit={searchRecipes} className="mb-6 relative">
                        <input
                            type="text"
                            placeholder="e.g. chicken, rice, broccoli"
                            value={ingredients}
                            onChange={(e) => setIngredients(e.target.value)}
                            className="w-full pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-slate-800 dark:text-slate-200 shadow-sm"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !ingredients.trim()}
                            className="absolute right-2 top-2 p-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                        </button>
                    </form>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium border border-red-100 dark:border-red-900 mb-4">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        {recipes.map((recipe) => (
                            <div key={recipe.id} className="group relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all flex flex-col sm:flex-row h-[120px]">
                                {recipe.image ? (
                                    <img src={recipe.image} alt={recipe.title} referrerPolicy="no-referrer" className="w-full sm:w-[140px] h-[120px] object-cover shrink-0" />
                                ) : (
                                    <div className="w-full sm:w-[140px] h-[120px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-400">
                                        <Utensils size={32} />
                                    </div>
                                )}
                                <div className="p-4 flex flex-col justify-center flex-1 min-w-0">
                                    <h3 className="font-bold text-slate-800 dark:text-slate-200 truncate pr-2 mb-1" title={recipe.title}>
                                        {recipe.title}
                                    </h3>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!isLoading && recipes.length === 0 && !error && (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 py-8">
                            <Utensils size={48} className="mb-4 opacity-50" />
                            <p className="text-sm font-medium">What's in your fridge?</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
