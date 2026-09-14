"use client";

import React, { useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import {
  Factory,
  PackageCheck,
  CalendarDays,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type Recipe = {
  id: number;
  name: string;
  description?: string;
  yield_quantity?: number;
  yield_unit?: string;
  cost_price?: number;
  finished_product_id?: number;
};

type ProductionResult = {
  id: number;
  organization_id: number;
  recipe_id: number;
  quantity_produced: number;
  batch_number: string;
  expiry_date?: string | null;
};

export default function ProductionPage() {
  const queryClient = useQueryClient();

  const [recipeId, setRecipeId] = useState("");
  const [quantityProduced, setQuantityProduced] = useState("1");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastProduction, setLastProduction] =
    useState<ProductionResult | null>(null);

  // Recipes
  const {
    data: recipes = [],
    isLoading: recipesLoading,
    isError: recipesError,
  } = useQuery<Recipe[]>({
    queryKey: ["recipes-list-for-production"],
    queryFn: async () => {
      const response = await apiClient.get("/recipes");
      return response.data;
    },
  });

  // Create production
  const createProductionMutation = useMutation({
    mutationFn: async (payload: {
      recipe_id: number;
      quantity_produced: number;
      batch_number: string;
      expiry_date?: string;
    }) => {
      const response = await apiClient.post("/production", payload);
      return response.data as ProductionResult;
    },

    onSuccess: (data) => {
      setLastProduction(data);
      setSuccessMessage(
        `Production #${data.id} created successfully.`
      );

      setFormError(null);

      // Refresh inventory-related data
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      queryClient.invalidateQueries({
        queryKey: ["dashboard-expiring-items"],
      });

      // Reset production-specific fields
      setQuantityProduced("1");
      setBatchNumber("");
      setExpiryDate("");
    },

    onError: (error: any) => {
      setSuccessMessage(null);
      setFormError(
        error?.response?.data?.detail ||
          "Failed to create production run."
      );
    },
  });

  const selectedRecipe = recipes.find(
    (recipe) => recipe.id === Number(recipeId)
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    setFormError(null);
    setSuccessMessage(null);

    const parsedRecipeId = Number(recipeId);
    const parsedQuantity = Number(quantityProduced);

    if (!parsedRecipeId || !Number.isFinite(parsedRecipeId)) {
      setFormError("Please select a recipe.");
      return;
    }

    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) {
      setFormError("Production quantity must be greater than 0.");
      return;
    }

    if (!batchNumber.trim()) {
      setFormError("Batch number is required.");
      return;
    }

    createProductionMutation.mutate({
      recipe_id: parsedRecipeId,
      quantity_produced: parsedQuantity,
      batch_number: batchNumber.trim(),
      ...(expiryDate ? { expiry_date: expiryDate } : {}),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <Factory className="w-5 h-5 text-emerald-600" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Production
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Produce finished goods from recipes and automatically
              consume ingredient inventory.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Production Form */}
        <div className="xl:col-span-2 bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
            <PackageCheck className="w-5 h-5 text-emerald-600" />

            <div>
              <h2 className="text-base font-bold text-slate-900">
                Create Production Run
              </h2>

              <p className="text-xs text-slate-500 mt-0.5">
                Ingredient stock is validated before production.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Recipe */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Recipe
              </label>

              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                disabled={recipesLoading || createProductionMutation.isPending}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">
                  {recipesLoading
                    ? "Loading recipes..."
                    : "Select a recipe"}
                </option>

                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>

              {recipesError && (
                <p className="mt-2 text-xs text-rose-600">
                  Unable to load recipes.
                </p>
              )}
            </div>

            {/* Selected recipe information */}
            {selectedRecipe && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-slate-900">
                      {selectedRecipe.name}
                    </p>

                    {selectedRecipe.description && (
                      <p className="text-xs text-slate-500 mt-1">
                        {selectedRecipe.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Recipe Cost
                    </p>

                    <p className="font-black text-slate-900">
                      ${Number(selectedRecipe.cost_price ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Quantity Produced
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={quantityProduced}
                  onChange={(e) =>
                    setQuantityProduced(e.target.value)
                  }
                  disabled={createProductionMutation.isPending}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              {/* Batch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Batch Number
                </label>

                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. PROD-ESP-001"
                  disabled={createProductionMutation.isPending}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Expiry Date
              </label>

              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={createProductionMutation.isPending}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>

              <p className="text-[11px] text-slate-400 mt-1.5">
                Optional, but recommended for FEFO production batches.
              </p>
            </div>

            {/* Error */}
            {formError && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Success */}
            {successMessage && (
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={
                createProductionMutation.isPending ||
                recipesLoading
              }
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 text-sm font-bold transition-colors"
            >
              {createProductionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Production...
                </>
              ) : (
                <>
                  <Factory className="w-4 h-4" />
                  Create Production Run
                </>
              )}
            </button>
          </form>
        </div>

        {/* Latest Result */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-bold text-slate-900">
            Latest Production
          </h2>

          <p className="text-xs text-slate-500 mt-1">
            The most recent production run created from this page.
          </p>

          {!lastProduction ? (
            <div className="mt-8 text-center py-10 text-slate-400 text-sm">
              No production run created in this session.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Production ID
                </p>

                <p className="text-lg font-black text-slate-900 mt-1">
                  #{lastProduction.id}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quantity
                </p>

                <p className="font-bold text-slate-800 mt-1">
                  {lastProduction.quantity_produced}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Batch
                </p>

                <p className="font-bold text-slate-800 mt-1">
                  {lastProduction.batch_number}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Expiry
                </p>

                <p className="font-bold text-slate-800 mt-1">
                  {lastProduction.expiry_date
                    ? new Date(
                        lastProduction.expiry_date
                      ).toLocaleDateString()
                    : "Not set"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}