import React, { useState, useEffect } from 'react';
import { Match, Team, MatchStatus, BattingStats, BowlingStats, Player } from '../types';
import { calculateOvers } from '../services/storageService';
import { generateAICommentary } from '../services/geminiService';
import { Mic, Trash2, Trophy, UserCheck, AlertCircle, ArrowRightLeft } from 'lucide-react';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
  onUpdate: (updatedMatch: Match) => void;
  onDelete: () => void;
}

type ExtraType = 'NONE' | 'WIDE' | 'NO_BALL' | 'LEG_BYE' | 'BYE';

export const AdminMatchControl: React.FC<Props> = ({ match, teamA, teamB, onUpdate, onDelete }) => {
  const [activeInnings, setActiveInnings] = useState<'A' | 'B'>('A');
  const [commentary, setCommentary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Scoring State
  const [extraType, setExtraType] = useState<ExtraType>('NONE');
  const [isWicket, setIsWicket] = useState(false);

  // Determine batting team players based on active innings
  const battingTeam = activeInnings === 'A' ? teamA : teamB;
  const bowlingTeam = activeInnings === 'A' ? teamB : teamA;
  
  const currentScore = activeInnings === 'A' ? match.scoreA : match.scoreB;
  const currentScorecard = (activeInnings === 'A' ? match.scorecard?.A : match.scorecard?.B) || { batting: [], bowling: [] };
  const bowlingScorecard = (activeInnings === 'A' ? match.scorecard?.B : match.scorecard?.A) || { batting: [], bowling: [] };

  // Local Selection State
  const [strikerId, setStrikerId] = useState<string>(match.liveDetails?.strikerId || '');
  const [nonStrikerId, setNonStrikerId] = useState<string>(match.liveDetails?.nonStrikerId || '');
  const [bowlerId, setBowlerId] = useState<string>(match.liveDetails?.bowlerId || '');

  // Calculate Target for 2nd Innings
  const target = match.scoreA.runs + 1;

  useEffect(() => {
      // Sync state from match data
      if (match.liveDetails) {
          setStrikerId(match.liveDetails.strikerId);
          setNonStrikerId(match.liveDetails.nonStrikerId);
          setBowlerId(match.liveDetails.bowlerId);
      }
      
      // Auto-detect Active Innings based on match state
      // If Match is scheduled, it's A. If A is done (overs/wickets), it's B.
      const innADone = match.scoreA.wickets === 10 || match.scoreA.balls === match.totalOvers * 6;
      if (innADone && match.scoreB.balls === 0 && match.scoreB.runs === 0 && match.status !== MatchStatus.COMPLETED) {
          setActiveInnings('B');
      } else if (match.scoreB.balls > 0) {
          setActiveInnings('B');
      } else {
          setActiveInnings('A');
      }

  }, [match.id, match.scoreA.balls, match.scoreB.balls, match.status]); 

  // --- STAT HELPERS ---
  const getBattingStats = (pid: string, list: BattingStats[], team: Team): BattingStats => {
      let stats = list.find(p => p.playerId === pid);
      if (!stats) {
          const playerInfo = team.players?.find(p => p.id === pid);
          stats = {
              playerId: pid,
              playerName: playerInfo?.name || 'Unknown',
              runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false
          };
          list.push(stats);
      }
      return stats;
  };

  const getBowlingStats = (pid: string, list: BowlingStats[], team: Team): BowlingStats => {
      let stats = list.find(p => p.playerId === pid);
      if (!stats) {
          const playerInfo = team.players?.find(p => p.id === pid);
          stats = {
              playerId: pid,
              playerName: playerInfo?.name || 'Unknown',
              overs: 0, ballsBowled: 0, runsConceded: 0, wickets: 0, maidens: 0
          };
          list.push(stats);
      }
      return stats;
  };

  // --- SWAP TEAMS (TOSS LOGIC) ---
  const handleSwapBattingFirst = () => {
      if (match.scoreA.balls > 0) return; // Prevent swapping if match started
      
      const updatedMatch = { ...match };
      // Swap IDs
      const tempId = updatedMatch.teamAId;
      updatedMatch.teamAId = updatedMatch.teamBId;
      updatedMatch.teamBId = tempId;
      
      // Reset details just in case
      updatedMatch.liveDetails = {
        strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
        bowlerId: '', bowlerName: ''
      };

      onUpdate(updatedMatch);
  };

  // --- MAIN SCORING LOGIC ---
  const handleScoreUpdate = (runVal: number) => {
      if (!strikerId || !bowlerId) {
          alert("Please select a Striker and a Bowler first.");
          return;
      }
      if (!nonStrikerId) {
          alert("Please select a Non-Striker.");
          return;
      }
      if (strikerId === nonStrikerId) {
          alert("Striker and Non-Striker cannot be the same person.");
          return;
      }

      // Clone Match Data
      const updatedMatch = JSON.parse(JSON.stringify(match)) as Match;
      if(!updatedMatch.scorecard) updatedMatch.scorecard = { A: { batting:[], bowling:[] }, B: { batting:[], bowling:[] } };

      const targetScore = activeInnings === 'A' ? updatedMatch.scoreA : updatedMatch.scoreB;
      const targetBattingList = activeInnings === 'A' ? updatedMatch.scorecard.A.batting : updatedMatch.scorecard.B.batting;
      const targetBowlingList = activeInnings === 'A' ? updatedMatch.scorecard.B.bowling : updatedMatch.scorecard.A.bowling;

      // 1. CALCULATE VALUES
      let batsmanRuns = 0;
      let teamExtras = 0;
      let validBallCount = 0; // 0 or 1
      let bowlerRunsConceded = 0;

      // Logic Table
      // Wide: Team+1+Runs, Ball 0, Bat 0, Bowler+1+Runs
      // NoBall: Team+1+Runs, Ball 0, Bat+Runs, Bowler+1+Runs
      // LegBye/Bye: Team+Runs, Ball 1, Bat 0, Bowler 0 (Extras don't count against bowler usually, but commonly in local cricket they count as runs conceded. Standard rules: Byes/LBs don't count to bowler. Wides/NBs do.)
      // Normal: Team+Runs, Ball 1, Bat+Runs, Bowler+Runs

      if (extraType === 'WIDE') {
          teamExtras = 1 + runVal; // 1 wide + ran runs
          batsmanRuns = 0; // Runs on wide don't count to batsman
          validBallCount = 0;
          bowlerRunsConceded = 1 + runVal;
      } else if (extraType === 'NO_BALL') {
          teamExtras = 1; // 1 NB penalty
          batsmanRuns = runVal; // Runs off bat count
          validBallCount = 0;
          bowlerRunsConceded = 1 + runVal;
      } else if (extraType === 'LEG_BYE' || extraType === 'BYE') {
          teamExtras = runVal;
          batsmanRuns = 0;
          validBallCount = 1;
          bowlerRunsConceded = 0; // Byes/LB don't count against bowler
      } else {
          // Normal Ball
          teamExtras = 0;
          batsmanRuns = runVal;
          validBallCount = 1;
          bowlerRunsConceded = runVal;
      }

      // 2. UPDATE BATSMAN STATS
      const batsman = getBattingStats(strikerId, targetBattingList, battingTeam);
      if (extraType !== 'WIDE') {
          // Wide doesn't count as ball faced
          batsman.balls += 1; 
          // If NB, it counts as ball faced? ICC: No ball does NOT count as ball faced. 
          if (extraType === 'NO_BALL') batsman.balls -= 1; 
      }
      
      batsman.runs += batsmanRuns;
      if (batsmanRuns === 4) batsman.fours += 1;
      if (batsmanRuns === 6) batsman.sixes += 1;
      
      if (isWicket) {
          // If it's a runout on a wide/NB, special logic. 
          // Assuming simple "Out" applies to striker for now unless complex UI added.
          // Note: On a wide, you can be stumped or run out.
          batsman.isOut = true;
          batsman.dismissal = extraType === 'NONE' ? 'b ' + getBowlingStats(bowlerId, targetBowlingList, bowlingTeam).playerName : 'Run Out';
      }

      // 3. UPDATE BOWLER STATS
      const bowler = getBowlingStats(bowlerId, targetBowlingList, bowlingTeam);
      if (validBallCount === 1) {
          bowler.ballsBowled += 1;
      }
      bowler.runsConceded += bowlerRunsConceded;
      if (isWicket && extraType !== 'WIDE' && extraType !== 'NO_BALL') {
           // Wickets on extras usually don't credit bowler unless stumping/hit wicket on wide
           bowler.wickets += 1; 
      }
      bowler.overs = calculateOvers(bowler.ballsBowled);

      // 4. UPDATE TEAM SCORE
      targetScore.runs += batsmanRuns + teamExtras;
      if (isWicket) targetScore.wickets += 1;
      targetScore.balls += validBallCount;
      targetScore.overs = calculateOvers(targetScore.balls);

      // 5. STRIKE ROTATION & END OF OVER LOGIC
      let nextStriker = strikerId;
      let nextNonStriker = nonStrikerId;
      let nextBowler = bowlerId;

      // Rotate on runs (Odd runs = swap)
      // Note: On NB/Wide + 1 run, they crossed? Usually yes.
      // Logic: If total physical runs (runVal) is odd, swap.
      if (runVal % 2 !== 0) {
          const temp = nextStriker;
          nextStriker = nextNonStriker;
          nextNonStriker = temp;
      }

      // End of Over?
      const isOverUp = targetScore.balls > 0 && targetScore.balls % 6 === 0 && validBallCount === 1;
      
      if (isOverUp) {
          // End of Over: Swap Striker
          const temp = nextStriker;
          nextStriker = nextNonStriker;
          nextNonStriker = temp;
          
          // Reset Bowler to force selection
          nextBowler = ''; 
      }

      // If Wicket, New Striker Needed
      if (isWicket) {
          nextStriker = ''; 
          // If runs were odd on the wicket ball (run out?), they might have crossed. 
          // Keeping simple: Striker is out, user selects new incoming batsman.
      }

      // 6. AUTO-COMPLETE / GAME STATE CHECKS
      
      // Check Win Condition (2nd Innings)
      let autoWinnerId = undefined;
      let autoStatus = match.status;

      if (activeInnings === 'B') {
          if (targetScore.runs >= match.scoreA.runs + 1) {
              autoStatus = MatchStatus.COMPLETED;
              autoWinnerId = teamB.id;
              nextStriker = ''; nextNonStriker = ''; nextBowler = ''; // Clear live state
          } else if (targetScore.wickets === 10 || targetScore.balls === match.totalOvers * 6) {
              // B All out or Overs Done
              if (targetScore.runs < match.scoreA.runs) {
                  autoStatus = MatchStatus.COMPLETED;
                  autoWinnerId = teamA.id;
              } else if (targetScore.runs === match.scoreA.runs) {
                  autoStatus = MatchStatus.COMPLETED;
                  // Tie - no winner ID set implies Tie in logic
              }
          }
      } else {
          // 1st Innings End?
          if (targetScore.wickets === 10 || targetScore.balls === match.totalOvers * 6) {
              // Just prompt user, don't force logic change yet, maybe they want to edit.
              // We'll handle visual cues in UI.
              nextBowler = ''; // Force bowler reset for new innings
          }
      }

      // Apply Updates
      updatedMatch.liveDetails = {
          strikerId: nextStriker,
          strikerName: nextStriker ? targetBattingList.find(p=>p.playerId===nextStriker)?.playerName || 'Select' : '',
          nonStrikerId: nextNonStriker,
          nonStrikerName: nextNonStriker ? targetBattingList.find(p=>p.playerId===nextNonStriker)?.playerName || 'Select' : '',
          bowlerId: nextBowler,
          bowlerName: nextBowler ? targetBowlingList.find(p=>p.playerId===nextBowler)?.playerName || 'Select' : '',
      };

      updatedMatch.status = autoStatus === MatchStatus.COMPLETED ? MatchStatus.COMPLETED : MatchStatus.LIVE;
      updatedMatch.winnerId = autoWinnerId;

      // Reset Input State
      setExtraType('NONE');
      setIsWicket(false);
      
      // Sync Local State
      setStrikerId(nextStriker);
      setNonStrikerId(nextNonStriker);
      setBowlerId(nextBowler);

      onUpdate(updatedMatch);
  };

  const getAvailableBatsmen = () => {
      if (!battingTeam.players) return [];
      return battingTeam.players.filter(p => {
          const stats = currentScorecard.batting.find(s => s.playerId === p.id);
          // Available if: No stats yet OR (Has stats AND is Not Out) AND (Is not currently the other batsman)
          if (!stats) return p.id !== nonStrikerId && p.id !== strikerId;
          return !stats.isOut && p.id !== nonStrikerId && p.id !== strikerId;
      });
  };

  const finishMatch = (winnerId: string | undefined) => {
      onUpdate({ ...match, status: MatchStatus.COMPLETED, winnerId });
  };
  
  const startInningsB = () => {
      const updated = { ...match };
      // Logic handled in useEffect, but we force refresh to ensure UI switches
      setActiveInnings('B');
      // Reset live details
      updated.liveDetails = {
          strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
          bowlerId: '', bowlerName: ''
      };
      onUpdate(updated);
  };

  // Determine if Innings A is effectively over
  const isInningsAOver = activeInnings === 'A' && (match.scoreA.wickets === 10 || match.scoreA.balls === match.totalOvers * 6);

  // Check if we can swap teams (Only if match hasn't started yet)
  const canSwapTeams = match.scoreA.balls === 0 && match.scoreA.runs === 0 && match.status !== MatchStatus.COMPLETED;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
      
      {/* Header & Score Summary */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
         <div>
             <h2 className="text-xl font-bold flex items-center gap-2">
                 {activeInnings === 'A' ? teamA.shortName : teamB.shortName} Batting
                 {activeInnings === 'B' && <span className="text-xs bg-slate-100 px-2 py-1 rounded border">Target: {target}</span>}
             </h2>
             <p className="text-slate-500 text-xs mt-1">
                 {match.status === MatchStatus.LIVE ? 'Match in Progress' : match.status}
             </p>
         </div>
         <div className="flex gap-2">
            {canSwapTeams && (
                <button 
                    onClick={handleSwapBattingFirst}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded flex items-center gap-2 text-sm font-bold"
                    title="Swap Batting/Bowling Team (Toss Decision)"
                >
                    <ArrowRightLeft size={20} /> <span className="hidden sm:inline">Switch Batting</span>
                </button>
            )}
            <button onClick={() => onDelete()} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={20} />
            </button>
         </div>
      </div>

      {match.status === MatchStatus.COMPLETED ? (
           <div className="text-center py-8">
               <h3 className="text-2xl font-bold text-slate-800 mb-2">Match Completed</h3>
               <p className="text-emerald-600 font-bold text-lg mb-6">
                   Winner: {match.winnerId === teamA.id ? teamA.name : teamB.name}
               </p>
               <button onClick={() => onUpdate({...match, status: MatchStatus.LIVE, winnerId: undefined})} className="text-sm underline text-slate-400">
                   Re-open Match (Undo Result)
               </button>
           </div>
      ) : (
        <>
            {/* PLAYER SELECTION */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Striker */}
                    <div>
                        <label className="block text-xs font-bold text-emerald-700 mb-1">On Strike</label>
                        <select 
                            className={`w-full border rounded px-2 py-2 text-sm ${!strikerId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                            value={strikerId}
                            onChange={(e) => setStrikerId(e.target.value)}
                        >
                            <option value="">Select Striker...</option>
                            {strikerId && <option value={strikerId}>{battingTeam.players?.find(p=>p.id===strikerId)?.name || 'Selected'}</option>}
                            {getAvailableBatsmen().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    {/* Non-Striker */}
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Non-Striker</label>
                        <select 
                            className={`w-full border rounded px-2 py-2 text-sm ${!nonStrikerId ? 'border-red-400 bg-red-50' : 'border-slate-300'}`}
                            value={nonStrikerId}
                            onChange={(e) => setNonStrikerId(e.target.value)}
                        >
                            <option value="">Select Non-Striker...</option>
                            {nonStrikerId && <option value={nonStrikerId}>{battingTeam.players?.find(p=>p.id===nonStrikerId)?.name || 'Selected'}</option>}
                            {getAvailableBatsmen().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    {/* Bowler */}
                    <div>
                        <label className="block text-xs font-bold text-blue-700 mb-1">Bowler</label>
                        <select 
                            className={`w-full border rounded px-2 py-2 text-sm ${!bowlerId ? 'border-red-500 bg-red-50' : 'border-slate-300'}`}
                            value={bowlerId}
                            onChange={(e) => setBowlerId(e.target.value)}
                        >
                            <option value="">{bowlerId ? 'Change Bowler' : 'Select New Bowler...'}</option>
                            {bowlingTeam.players?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        {!bowlerId && <p className="text-xs text-red-500 mt-1 font-bold animate-pulse">Select Bowler to continue!</p>}
                    </div>
                </div>
            </div>

            {/* END OF INNINGS A PROMPT */}
            {isInningsAOver && activeInnings === 'A' && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-center mb-6">
                    <h3 className="font-bold text-yellow-800 mb-2">Innings Break</h3>
                    <p className="text-sm text-yellow-700 mb-4">{teamA.shortName} finished at {currentScore.runs}/{currentScore.wickets}. Target: {currentScore.runs + 1}</p>
                    <button onClick={startInningsB} className="bg-yellow-600 text-white px-6 py-2 rounded-lg font-bold shadow hover:bg-yellow-700">
                        Start 2nd Innings
                    </button>
                </div>
            )}

            {/* SCORING CONTROLS */}
            <div className={`transition-opacity ${(!strikerId || !bowlerId || !nonStrikerId || isInningsAOver) ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                
                {/* Score Big Display */}
                <div className="text-center mb-6">
                    <div className="text-6xl font-mono font-bold text-slate-800 tracking-tighter">
                        {currentScore.runs}/{currentScore.wickets}
                    </div>
                    <div className="text-slate-500 font-medium">
                        Overs: {currentScore.overs} <span className="text-slate-300">/ {match.totalOvers}</span>
                    </div>
                </div>

                {/* Extras Toggles */}
                <div className="flex flex-wrap justify-center gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {['NONE', 'WIDE', 'NO_BALL', 'LEG_BYE', 'BYE'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setExtraType(type as ExtraType)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${extraType === type ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border hover:bg-slate-100'}`}
                        >
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                    <button
                        onClick={() => setIsWicket(!isWicket)}
                        className={`px-3 py-1 rounded text-xs font-bold transition-colors border ${isWicket ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-500 border-red-200 hover:bg-red-50'}`}
                    >
                        WICKET
                    </button>
                </div>

                {/* Numeric Input */}
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 max-w-2xl mx-auto mb-6">
                    {[0, 1, 2, 3, 4, 6].map((run) => (
                        <button
                            key={run}
                            onClick={() => handleScoreUpdate(run)}
                            className={`py-4 rounded-xl font-bold text-2xl shadow-sm border transition-transform active:scale-95 ${
                                run === 4 ? 'bg-emerald-600 text-white border-emerald-700' :
                                run === 6 ? 'bg-emerald-800 text-white border-emerald-900' :
                                'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {run}
                        </button>
                    ))}
                    {/* 5, 7 runs are rare but possible on overthrows, kept out for simplicity of UI unless requested */}
                </div>

                {/* Contextual Hints */}
                <div className="text-center text-xs text-slate-400 mb-4 h-6">
                    {extraType === 'WIDE' && `Wide + Selected Runs (No Ball Count)`}
                    {extraType === 'NO_BALL' && `No Ball + Batsman Runs (No Ball Count)`}
                    {isWicket && <span className="text-red-500 font-bold">Wicket will be recorded!</span>}
                </div>

            </div>
        </>
      )}
    </div>
  );
};