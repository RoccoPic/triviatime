export function RunHUD({
  lives,
  runMoney,
  floor,
  encounterIndex,
  totalEncounters,
  floorCategoryName,
}: {
  lives: number;
  runMoney: number;
  floor: number;
  encounterIndex: number;
  totalEncounters: number;
  floorCategoryName: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-zinc-900/80 rounded-lg border border-zinc-700">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 text-sm">Lives</span>
          <span className="font-bold text-red-400">{lives}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 text-sm">Run $</span>
          <span className="font-bold text-amber-400">{runMoney}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-zinc-400 text-sm">Floor</span>
          <span className="font-bold">{floor}</span>
          <span className="text-zinc-500 text-sm">({floorCategoryName})</span>
        </div>
      </div>
      <div className="text-zinc-400 text-sm">
        Encounter {encounterIndex + 1} / {totalEncounters}
      </div>
    </div>
  );
}
