import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function Search() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  function go() {
    if (!query.trim()) return;
    navigate(`/u/${query.trim().replace(/^@/, "")}`);
  }

  return (
    <div className="glass-panel rounded-2xl p-6 max-w-md">
      <h2 className="text-lg font-bold mb-4">Search users</h2>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="@username"
          className="flex-1 bg-black/30 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button onClick={go} className="bg-gradient-to-r from-brain-accent to-brain-accent2 text-sm font-semibold px-4 py-2 rounded-full">
          Go
        </button>
      </div>
    </div>
  );
}
