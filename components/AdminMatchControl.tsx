import React, { useState, useEffect } from 'react';
import { Match, Team, MatchStatus, BattingStats, BowlingStats, Player, TeamScorecard, LiveDetails } from '../types';
import { calculateOvers } from '../services/storageService';
import { Trash2, Trophy, ArrowRightLeft, Hand, XCircle, RotateCcw, PlusCircle, RefreshCw, PlayCircle, CloudOff } from 'lucide-react';

interface Props {
  match: Match;
  teamA: Team;
  teamB: Team;
  onUpdate: (updatedMatch: Match) => Promise<void>; 
  onDelete: () => void;
}

type ExtraType = 'NONE' | 'WIDE' | 'NO_BALL' | 'LEG_BYE' | 'BYE';
type WicketType = 'NONE' | 'BOWLED' | 'CAUGHT' | 'LBW' | 'STUMPED' | 'RUN_OUT' | 'HIT_WICKET';
type WhoOut = 'STRIKER' | 'NON_STRIKER';

export const AdminMatchControl: React.FC<Props> = ({ match, teamA, teamB, onUpdate, onDelete }) => {
  const [activeInnings, setActiveInnings] = useState<'A' | 'B'>('A');
  const [isUpdating, setIsUpdating] = useState(false);

  // Derived state to check if match is in setup phase
  const isMatchStarting = match.status === MatchStatus.SCHEDULED;

  // Scoring State
  const [extraType, setExtraType] = useState<ExtraType>('NONE');
  const [isOverthrow, setIsOverthrow] = useState(false); 
  
  // Advanced Wicket State
  const [wicketType, setWicketType] = useState<WicketType>('NONE');
  const [whoOut, setWhoOut] = useState<WhoOut>('STRIKER');
  const [fielderId, setFielderId] = useState<string>(''); 

  const battingTeam = activeInnings === 'A' ? teamA : teamB;
  const bowlingTeam = activeInnings === 'A' ? teamB : teamA;
  
  const currentScore = activeInnings === 'A' ? match.scoreA : match.scoreB;
  const currentScorecard = (activeInnings === 'A' ? match.scorecard?.A : match.scorecard?.B) || { batting: [], bowling: [], extras: { wide: 0, noBall: 0, bye: 0, legBye: 0 } };
  const currentExtras = currentScorecard.extras || { wide: 0, noBall: 0, bye: 0, legBye: 0 };

  const [strikerId, setStrikerId] = useState<string>(match.liveDetails?.strikerId || '');
  const [nonStrikerId, setNonStrikerId] = useState<string>(match.liveDetails?.nonStrikerId || '');
  const [bowlerId, setBowlerId] = useState<string>(match.liveDetails?.bowlerId || '');

  const target = match.scoreA.runs + 1;
  
  // CRITICAL FIX: Ensure the limit is strictly handled from the match object
  const maxWkts = match.maxWickets !== undefined ? match.maxWickets : 10;
  const squadSize = maxWkts === 1 ? 1 : maxWkts + 1;

  // Innings Completion logic check
  const isCurrentInningsOver = currentScore.isDeclared || 
                               currentScore.wickets >= maxWkts || 
                               currentScore.balls >= (match.totalOvers * 6) || 
                               match.status === MatchStatus.COMPLETED;

  useEffect(() => {
      if (match.liveDetails) {
          setStrikerId(match.liveDetails.strikerId);
          setNonStrikerId(match.liveDetails.nonStrikerId);
          setBowlerId(match.liveDetails.bowlerId);
      }
      
      const innADone = match.scoreA.wickets >= maxWkts || match.scoreA.balls === match.totalOvers * 6 || match.scoreA.isDeclared;
      
      if (innADone && match.scoreB.balls === 0 && match.scoreB.runs === 0 && match.status !== MatchStatus.COMPLETED) {
          setActiveInnings('B');
      } else if (match.scoreB.balls > 0 || (match.scoreB.runs > 0) || match.scoreB.isDeclared) {
          setActiveInnings('B');
      } else {
          setActiveInnings('A');
      }

  }, [match.id, match.scoreA.balls, match.scoreA.wickets, match.scoreB.balls, match.status, maxWkts]); 

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
      if (stats.maidens === undefined || stats.maidens === null) {
          stats.maidens = 0;
      }
      return stats;
  };

  const handleLiveDetailChange = async (field: keyof LiveDetails, value: string) => {
    setIsUpdating(true);
    try {
        const updatedMatch = JSON.parse(JSON.stringify(match)) as Match;
        if (!updatedMatch.liveDetails) {
            updatedMatch.liveDetails = { strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '', bowlerId: '', bowlerName: '' };
        }

        if (field === 'strikerId') {
            updatedMatch.liveDetails.strikerId = value;
            const p = battingTeam.players?.find(pl => pl.id === value);
            updatedMatch.liveDetails.strikerName = p?.name || '';
            setStrikerId(value);
        } else if (field === 'nonStrikerId') {
            updatedMatch.liveDetails.nonStrikerId = value;
            const p = battingTeam.players?.find(pl => pl.id === value);
            updatedMatch.liveDetails.nonStrikerName = p?.name || '';
            setNonStrikerId(value);
        } else if (field === 'bowlerId') {
            updatedMatch.liveDetails.bowlerId = value;
            const p = bowlingTeam.players?.find(pl => pl.id === value);
            updatedMatch.liveDetails.bowlerName = p?.name || '';
            setBowlerId(value);
        }

        await onUpdate(updatedMatch);
    } catch (e) {
        console.error("Live detail update failed", e);
    } finally {
        setIsUpdating(false);
    }
  };

  const handleMOMSelect = async (pid: string) => {
      setIsUpdating(true);
      try {
          const updated = JSON.parse(JSON.stringify(match)) as Match;
          updated.manOfTheMatch = pid;
          await onUpdate(updated);
      } catch (e) {
          console.error(e);
      } finally {
          setIsUpdating(false);
      }
  };

  const handleUndo = async () => {
      if (!match.history || match.history.length === 0) return;
      
      const confirmUndo = window.confirm("Are you sure you want to UNDO the last action?");
      if (!confirmUndo) return;

      setIsUpdating(true);
      try {
          const historyCopy = [...match.history];
          const previousStateJson = historyCopy.pop(); 
          
          if (previousStateJson) {
              const previousState = JSON.parse(previousStateJson);
              previousState.history = historyCopy; 
              await onUpdate(previousState);
          }
      } catch (error) {
          console.error("Undo failed", error);
      } finally {
          setIsUpdating(false);
      }
  };

  const handleStartMatch = async () => {
      setIsUpdating(true);
      try {
        const updated = JSON.parse(JSON.stringify(match)) as Match;
        updated.status = MatchStatus.LIVE;
        await onUpdate(updated);
      } catch (e) { console.error(e); } 
      finally { setIsUpdating(false); }
  };

  const handleAbandonMatch = async () => {
      if (!window.confirm("ABANDON match due to rain or other emergency?")) return;
      setIsUpdating(true);
      try {
          const updated = JSON.parse(JSON.stringify(match)) as Match;
          updated.status = MatchStatus.ABANDONED;
          updated.liveDetails = { strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '', bowlerId: '', bowlerName: '' };
          await onUpdate(updated);
      } catch (e) { console.error(e); } finally { setIsUpdating(false); }
  };

  const handleManualEndInnings = async () => {
      const message = activeInnings === 'A' 
          ? `Are you sure you want to END the 1st Innings for ${teamA.name}?` 
          : "Are you sure you want to END the Match now?";
      
      if (!window.confirm(message)) return;

      setIsUpdating(true);
      try {
          const updated = JSON.parse(JSON.stringify(match)) as Match;
          if (!updated.history) updated.history = [];
          const currentStateSnapshot = JSON.stringify({ ...match, history: undefined });
          updated.history.push(currentStateSnapshot);
          if (updated.history.length > 50) updated.history.shift();

          if (activeInnings === 'A') {
              updated.scoreA.isDeclared = true;
              updated.currentOverRuns = 0;
              updated.currentOverBalls = 0;
              updated.liveDetails = {
                strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
                bowlerId: '', bowlerName: ''
              };
          } else {
              updated.scoreB.isDeclared = true;
              updated.status = MatchStatus.COMPLETED;
              if (updated.scoreB.runs > updated.scoreA.runs) {
                  updated.winnerId = teamB.id;
              } else if (updated.scoreA.runs > updated.scoreB.runs) {
                  updated.winnerId = teamA.id;
              } else {
                  updated.winnerId = 'TIED'; 
              }
              updated.liveDetails = {
                strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
                bowlerId: '', bowlerName: ''
              };
          }
          await onUpdate(updated);
      } catch (error) {
          console.error("Error ending innings manually", error);
      } finally {
          setIsUpdating(false);
      }
  };

  const handleSwapBattingFirst = async () => {
      if (match.scoreA.balls > 0) return; 
      setIsUpdating(true);
      try {
        const updatedMatch = JSON.parse(JSON.stringify(match)) as Match;
        const tempId = updatedMatch.teamAId;
        updatedMatch.teamAId = updatedMatch.teamBId;
        updatedMatch.teamBId = tempId;
        updatedMatch.liveDetails = {
          strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
          bowlerId: '', bowlerName: ''
        };
        await onUpdate(updatedMatch);
      } catch (error) {
        console.error("Error swapping teams", error);
        alert("Failed to swap teams.");
      } finally {
        setIsUpdating(false);
      }
  };

  const handleScoreUpdate = async (runVal: number) => {
      if (!strikerId || !bowlerId || !nonStrikerId) {
          alert("Please select Striker, Non-Striker and Bowler.");
          return;
      }
      if (strikerId === nonStrikerId) {
          alert("Striker and Non-Striker cannot be the same person.");
          return;
      }
      if ((wicketType === 'CAUGHT' || wicketType === 'RUN_OUT') && !fielderId) {
          alert("Please select a Fielder for this wicket.");
          return;
      }

      setIsUpdating(true);
      try {
        const updatedMatch = JSON.parse(JSON.stringify(match)) as Match;
        if(!updatedMatch.scorecard) updatedMatch.scorecard = { A: { batting:[], bowling:[], extras: {wide:0, noBall:0, bye:0, legBye:0} }, B: { batting:[], bowling:[], extras: {wide:0, noBall:0, bye:0, legBye:0} } };

        if (!updatedMatch.history) updatedMatch.history = [];
        const currentStateSnapshot = JSON.stringify({ ...match, history: undefined });
        updatedMatch.history.push(currentStateSnapshot);
        if (updatedMatch.history.length > 50) updatedMatch.history.shift();

        const targetScore = activeInnings === 'A' ? updatedMatch.scoreA : updatedMatch.scoreB;
        const targetInningsCard = activeInnings === 'A' ? updatedMatch.scorecard.A : updatedMatch.scorecard.B;
        const targetBattingList = targetInningsCard.batting;
        const targetBowlingList = activeInnings === 'A' ? updatedMatch.scorecard.B.bowling : updatedMatch.scorecard.A.bowling;

        if (!targetInningsCard.extras) {
          targetInningsCard.extras = { wide: 0, noBall: 0, bye: 0, legBye: 0 };
        }

        const isWicket = wicketType !== 'NONE';
        let effectiveRunVal = runVal;
        if (isOverthrow) effectiveRunVal += 4;

        let batsmanRuns = 0;
        let teamExtras = 0;
        let validBallCount = 0;
        let bowlerRunsConceded = 0;

        if (extraType === 'WIDE') {
            teamExtras = 1 + effectiveRunVal; 
            validBallCount = 0;
            bowlerRunsConceded = 1 + effectiveRunVal;
            targetInningsCard.extras.wide += 1 + effectiveRunVal;
        } else if (extraType === 'NO_BALL') {
            teamExtras = 1; 
            batsmanRuns = effectiveRunVal;
            validBallCount = 0;
            bowlerRunsConceded = 1 + effectiveRunVal;
            targetInningsCard.extras.noBall += 1;
        } else if (extraType === 'LEG_BYE' || extraType === 'BYE') {
            teamExtras = effectiveRunVal;
            validBallCount = 1;
            bowlerRunsConceded = 0; 
            if (extraType === 'BYE') targetInningsCard.extras.bye += effectiveRunVal;
            else targetInningsCard.extras.legBye += effectiveRunVal;
        } else {
            batsmanRuns = effectiveRunVal;
            validBallCount = 1;
            bowlerRunsConceded = effectiveRunVal;
        }

        const striker = getBattingStats(strikerId, targetBattingList, battingTeam);
        if (extraType !== 'WIDE') striker.balls += 1;
        striker.runs += batsmanRuns;
        
        if (!isOverthrow) {
            if (batsmanRuns === 4) striker.fours += 1;
            if (batsmanRuns === 6) striker.sixes += 1;
        } else {
             striker.fours += 1;
        }
        
        if (isWicket) {
            const dismissedPlayerId = (wicketType === 'RUN_OUT' && whoOut === 'NON_STRIKER') ? nonStrikerId : strikerId;
            const dismissedPlayerStats = getBattingStats(dismissedPlayerId, targetBattingList, battingTeam);
            dismissedPlayerStats.isOut = true;
            const bowlerStats = getBowlingStats(bowlerId, targetBowlingList, bowlingTeam);
            let dismissalText = "";
            const fielderName = bowlingTeam.players?.find(p => p.id === fielderId)?.name || 'Fielder';

            switch (wicketType) {
                case 'BOWLED': dismissalText = `b ${bowlerStats.playerName}`; break;
                case 'CAUGHT': 
                    dismissalText = `c ${fielderName} b ${bowlerStats.playerName}`; 
                    break;
                case 'LBW': dismissalText = `lbw b ${bowlerStats.playerName}`; break;
                case 'STUMPED': dismissalText = `st Keeper b ${bowlerStats.playerName}`; break;
                case 'HIT_WICKET': dismissalText = `hit wkt b ${bowlerStats.playerName}`; break;
                case 'RUN_OUT': dismissalText = `run out (${fielderName})`; break;
                default: dismissalText = `out`;
            }
            dismissedPlayerStats.dismissal = dismissalText;
        }

        const bowler = getBowlingStats(bowlerId, targetBowlingList, bowlingTeam);
        if (validBallCount === 1) bowler.ballsBowled += 1;
        bowler.runsConceded += bowlerRunsConceded;
        if (isWicket && wicketType !== 'RUN_OUT') bowler.wickets += 1; 
        bowler.overs = calculateOvers(bowler.ballsBowled);

        if (updatedMatch.currentOverRuns === undefined) updatedMatch.currentOverRuns = 0;
        if (updatedMatch.currentOverBalls === undefined) updatedMatch.currentOverBalls = 0;

        updatedMatch.currentOverRuns += bowlerRunsConceded; 
        if (validBallCount === 1) updatedMatch.currentOverBalls += 1;

        if (updatedMatch.currentOverBalls === 6) {
            if (updatedMatch.currentOverRuns === 0) {
                bowler.maidens = (bowler.maidens || 0) + 1;
            }
        }

        targetScore.runs += batsmanRuns + teamExtras;
        if (isWicket) targetScore.wickets += 1;
        targetScore.balls += validBallCount;
        targetScore.overs = calculateOvers(targetScore.balls);

        let nextStriker = strikerId;
        let nextNonStriker = nonStrikerId;
        let nextBowler = bowlerId;

        if (isWicket) {
            if (wicketType === 'RUN_OUT' && whoOut === 'NON_STRIKER') nextNonStriker = ''; 
            else nextStriker = '';
        }

        if (effectiveRunVal % 2 !== 0) {
            const temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
        }

        const isOverUp = targetScore.balls > 0 && targetScore.balls % 6 === 0 && validBallCount === 1;
        if (isOverUp) {
            const temp = nextStriker;
            nextStriker = nextNonStriker;
            nextNonStriker = temp;
            nextBowler = ''; 
            updatedMatch.currentOverRuns = 0;
            updatedMatch.currentOverBalls = 0;
        }

        let autoWinnerId: string | undefined = undefined;
        let isMatchCompleted = false;

        // CRITICAL ENFORCEMENT: Immediately evaluate if innings/match should end based on custom wicket limit
        if (activeInnings === 'B') {
            if (targetScore.runs >= (match.scoreA.runs + 1)) {
                isMatchCompleted = true;
                autoWinnerId = teamB.id;
                nextStriker = ''; nextNonStriker = ''; nextBowler = '';
            } else if (targetScore.wickets >= maxWkts || targetScore.balls === (match.totalOvers * 6)) {
                isMatchCompleted = true;
                if (targetScore.runs < match.scoreA.runs) {
                    autoWinnerId = teamA.id;
                } else if (targetScore.runs === match.scoreA.runs) {
                    autoWinnerId = 'TIED';
                }
                nextStriker = ''; nextNonStriker = ''; nextBowler = '';
            }
        } else {
            // End 1st Innings if all out (maxWkts reached) or overs up
            if (targetScore.wickets >= maxWkts || targetScore.balls === (match.totalOvers * 6)) {
                updatedMatch.scoreA.isDeclared = true;
                nextStriker = ''; nextNonStriker = ''; nextBowler = '';
            }
        }

        updatedMatch.liveDetails = {
            strikerId: nextStriker,
            strikerName: nextStriker ? targetBattingList.find(p=>p.playerId===nextStriker)?.playerName || 'Select' : '',
            nonStrikerId: nextNonStriker,
            nonStrikerName: nextNonStriker ? targetBattingList.find(p=>p.playerId===nextNonStriker)?.playerName || 'Select' : '',
            bowlerId: nextBowler,
            bowlerName: nextBowler ? targetBowlingList.find(p=>p.playerId===nextBowler)?.playerName || 'Select' : '',
        };

        updatedMatch.status = isMatchCompleted ? MatchStatus.COMPLETED : MatchStatus.LIVE;
        if (autoWinnerId) updatedMatch.winnerId = autoWinnerId;

        setExtraType('NONE');
        setWicketType('NONE');
        setWhoOut('STRIKER');
        setFielderId('');
        setIsOverthrow(false); 
        
        setStrikerId(nextStriker);
        setNonStrikerId(nextNonStriker);
        setBowlerId(nextBowler);

        await onUpdate(updatedMatch);
      } catch (e) {
        console.error("Scoring Error:", e);
        alert("Failed to update score.");
      } finally {
        setIsUpdating(false);
      }
  };

  const getAvailableBatsmen = () => {
      if (!battingTeam.players) return [];
      return battingTeam.players.filter(p => {
          const stats = currentScorecard.batting.find(s => s.playerId === p.id);
          if (!stats) return p.id !== nonStrikerId && p.id !== strikerId;
          return !stats.isOut && p.id !== nonStrikerId && p.id !== strikerId;
      });
  };
  
  const startInningsB = async () => {
      setIsUpdating(true);
      try {
        const updated = JSON.parse(JSON.stringify(match)) as Match;
        setActiveInnings('B');
        updated.currentOverRuns = 0;
        updated.currentOverBalls = 0;
        updated.liveDetails = {
            strikerId: '', strikerName: '', nonStrikerId: '', nonStrikerName: '',
            bowlerId: '', bowlerName: ''
        };
        await onUpdate(updated);
      } catch (e) { console.error(e); } 
      finally { setIsUpdating(false); }
  };

  const isInningsAOver = activeInnings === 'A' && (match.scoreA.wickets >= maxWkts || match.scoreA.balls === match.totalOvers * 6 || match.scoreA.isDeclared);
  const allPlayers = [...(teamA.players || []), ...(teamB.players || [])];

  const wicketOptions: {type: WicketType, label: string}[] = [
      { type: 'BOWLED', label: 'Bowled' },
      { type: 'CAUGHT', label: 'Caught' },
      { type: 'LBW', label: 'LBW' },
      { type: 'RUN_OUT', label: 'Run Out' },
      { type: 'STUMPED', label: 'Stumped' },
      { type: 'HIT_WICKET', label: 'Hit Wicket' },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 border border-slate-200 relative ${isUpdating ? 'opacity-80' : ''}`}>
      {isUpdating && <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}
      
      <div className="flex justify-between items-center mb-6 border-b pb-4">
         <div>
             <h2 className="text-xl font-bold flex items-center gap-2">
                 {activeInnings === 'A' ? teamA.name : teamB.name} Batting
                 {activeInnings === 'B' && <span className="text-xs bg-slate-100 px-2 py-1 rounded border">Target: {target}</span>}
             </h2>
             <div className="flex items-center gap-2 mt-1">
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Status: {match.status}</p>
                 <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                 <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">Squad: {squadSize}P ({maxWkts} Wkts Limit)</p>
             </div>
         </div>
         <div className="flex gap-2">
            <button onClick={handleAbandonMatch} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100" title="Abandon Match"><CloudOff size={18}/></button>
            {(isMatchStarting || match.scoreA.balls === 0) && match.status !== MatchStatus.COMPLETED && (
                <button onClick={handleSwapBattingFirst} disabled={isUpdating} className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded flex items-center gap-2 text-sm font-bold border border-emerald-200" title="Switch Batting Team">
                    <ArrowRightLeft size={18} /> <span className="hidden sm:inline">Switch Batting</span>
                </button>
            )}
            {match.history && match.history.length > 0 && (
                <button onClick={handleUndo} disabled={isUpdating} className="p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-2 text-sm font-bold border border-slate-200">
                    <RotateCcw size={18} /> <span className="hidden sm:inline">Undo</span>
                </button>
            )}
            {match.status === MatchStatus.LIVE && (
                <button onClick={handleManualEndInnings} disabled={isUpdating} className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded flex items-center gap-2 text-sm font-bold border border-orange-200">
                    <Hand size={18} /> <span className="hidden sm:inline">{activeInnings === 'A' ? "End Innings" : "End Match"}</span>
                </button>
            )}
            <button onClick={() => onDelete()} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 size={20} />
            </button>
         </div>
      </div>

      {isMatchStarting ? (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-8 text-center mb-8 animate-fade-in-down">
              <div className="flex justify-center mb-4"><Trophy className="text-emerald-600" size={48}/></div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Match Setup & Toss</h3>
              <p className="text-slate-500 mb-6 text-sm">Select which team bats first based on the toss result.</p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <div className="flex-1 bg-white p-4 rounded-xl border-2 border-emerald-100 shadow-sm w-full">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Batting First</p>
                      <p className="text-lg font-bold text-slate-800">{teamA.name}</p>
                  </div>
                  <button onClick={handleSwapBattingFirst} className="p-4 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-transform active:scale-90 shadow-lg">
                      <RefreshCw size={24}/>
                  </button>
                  <div className="flex-1 bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm w-full">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Bowling First</p>
                      <p className="text-lg font-bold text-slate-800">{teamB.name}</p>
                  </div>
              </div>

              <button onClick={handleStartMatch} className="mt-8 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest flex items-center gap-2 mx-auto hover:bg-emerald-700 shadow-xl shadow-emerald-100">
                  <PlayCircle size={24}/> Start Live Scoring
              </button>
          </div>
      ) : match.status === MatchStatus.COMPLETED || match.status === MatchStatus.ABANDONED ? (
           <div className="text-center py-8">
               <Trophy size={48} className="mx-auto mb-4 text-emerald-500" />
               <h3 className="text-2xl font-bold text-slate-800 mb-2">Match {match.status}</h3>
               {match.winnerId && <p className="text-emerald-600 font-bold text-lg mb-4">Winner: {match.winnerId === teamA.id ? teamA.name : (match.winnerId === teamB.id ? teamB.name : (match.winnerId === 'TIED' ? "Tied" : "Abandoned"))}</p>}
               
               <div className="max-w-xs mx-auto mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                   <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Man of the Match</label>
                   <select 
                        className="w-full border rounded-xl px-3 py-2 text-sm font-bold bg-white text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
                        value={match.manOfTheMatch || ''}
                        onChange={(e) => handleMOMSelect(e.target.value)}
                   >
                       <option value="">Select MOM Player...</option>
                       {allPlayers.map(p => (
                           <option key={p.id} value={p.id}>{p.name} ({teamA.players?.some(ap=>ap.id===p.id) ? teamA.shortName : teamB.shortName})</option>
                       ))}
                   </select>
               </div>

               <button onClick={() => onUpdate({...match, status: MatchStatus.LIVE, winnerId: undefined})} className="text-sm underline text-slate-400">Re-open Match</button>
           </div>
      ) : (
        <>
            {/* INNINGS BREAK SECTION */}
            {isInningsAOver && activeInnings === 'A' && (
                <div className="bg-yellow-50 border-2 border-yellow-200 p-8 rounded-3xl text-center mb-8 animate-fade-in-up">
                    <h3 className="text-2xl font-black text-yellow-800 mb-2 uppercase">1st Innings Finished</h3>
                    <p className="text-slate-600 mb-6">{teamA.name} scored {match.scoreA.runs}/{match.scoreA.wickets} in {match.scoreA.overs} overs.</p>
                    <div className="bg-white p-4 rounded-2xl border-2 border-yellow-100 shadow-sm inline-block mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Target for {teamB.name}</p>
                        <p className="text-3xl font-black text-yellow-600">{target} Runs</p>
                    </div>
                    <div>
                        <button onClick={startInningsB} className="bg-yellow-600 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-yellow-100 hover:bg-yellow-700 transition-all flex items-center gap-2 mx-auto">
                            <PlayCircle size={24}/> Start 2nd Innings
                        </button>
                    </div>
                </div>
            )}

            {/* SCORING AREA - ONLY VISIBLE IF INNINGS NOT OVER AND NOT SHOWING BREAK SCREEN */}
            {!isCurrentInningsOver && !isInningsAOver ? (
              <div className="animate-fade-in">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-emerald-700 mb-1">On Strike</label>
                            <select className={`w-full border rounded px-2 py-2 text-sm ${!strikerId ? 'border-red-400' : ''}`} value={strikerId} onChange={(e) => handleLiveDetailChange('strikerId', e.target.value)}>
                                <option value="">Select Striker...</option>
                                {strikerId && <option value={strikerId}>{battingTeam.players?.find(p=>p.id===strikerId)?.name}</option>}
                                {getAvailableBatsmen().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">Non-Striker</label>
                            <select className={`w-full border rounded px-2 py-2 text-sm ${!nonStrikerId ? 'border-red-400' : ''}`} value={nonStrikerId} onChange={(e) => handleLiveDetailChange('nonStrikerId', e.target.value)}>
                                <option value="">Select Non-Striker...</option>
                                {nonStrikerId && <option value={nonStrikerId}>{battingTeam.players?.find(p=>p.id===nonStrikerId)?.name}</option>}
                                {getAvailableBatsmen().map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-blue-700 mb-1">Bowler</label>
                            <select className={`w-full border rounded px-2 py-2 text-sm ${!bowlerId ? 'border-red-500' : ''}`} value={bowlerId} onChange={(e) => handleLiveDetailChange('bowlerId', e.target.value)}>
                                <option value="">Select Bowler...</option>
                                {bowlingTeam.players?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-6 flex flex-col items-center">
                    <div className="text-6xl font-mono font-bold text-slate-800 tracking-tighter">{currentScore.runs}/{currentScore.wickets}</div>
                    <div className="text-slate-500 font-medium">Overs: {currentScore.overs} <span className="text-slate-300">/ {match.totalOvers}</span></div>
                    
                    <div className="mt-4 bg-slate-100 px-4 py-2 rounded-full border border-slate-200 flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <span className="flex items-center gap-1.5"><PlusCircle size={10} className="text-blue-500"/> Extras:</span>
                        <span className="text-slate-600">Wide: <span className="text-blue-600">{currentExtras.wide}</span></span>
                        <span className="text-slate-600">NB: <span className="text-blue-600">{currentExtras.noBall}</span></span>
                        <span className="text-slate-600">Bye: <span className="text-blue-600">{currentExtras.bye}</span></span>
                        <span className="text-slate-600">LB: <span className="text-blue-600">{currentExtras.legBye}</span></span>
                    </div>
                </div>

                <div className="mb-2">
                    <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1 mb-3">Update Score:</h3>
                </div>

                <div className="flex flex-col gap-4 mb-4">
                     <div className="flex flex-wrap justify-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {['NONE', 'WIDE', 'NO_BALL', 'LEG_BYE', 'BYE'].map((type) => (
                            <button
                                key={type}
                                onClick={() => {
                                    setExtraType(type as ExtraType);
                                    if (type !== 'NONE') setIsOverthrow(false); 
                                }}
                                className={`px-3 py-1 rounded text-xs font-bold transition-colors ${extraType === type ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border hover:bg-slate-100'}`}
                            >
                                {type === 'NONE' ? 'BATSMAN' : type.replace('_', ' ')}
                            </button>
                        ))}
                        <button
                            onClick={() => {
                                const newState = !isOverthrow;
                                setIsOverthrow(newState);
                                if (newState) setExtraType('NONE');
                            }}
                            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${isOverthrow ? 'bg-purple-600 text-white' : 'bg-white text-slate-500 border hover:bg-slate-100'}`}
                        >
                            OVERTHROW (+4)
                        </button>
                    </div>

                    <div className={`flex flex-col items-center gap-3 p-2 rounded-lg border transition-colors ${wicketType !== 'NONE' ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex flex-wrap justify-center gap-2">
                            <span className="text-xs font-bold text-red-400 self-center uppercase mr-2">Wicket:</span>
                            {wicketType === 'NONE' ? (
                                <div className="relative group">
                                    <button className="px-4 py-1 rounded text-xs font-bold bg-white text-red-500 border border-red-200 hover:bg-red-50 flex items-center gap-1">
                                        <XCircle size={14}/> NO WICKET
                                    </button>
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white border border-slate-200 shadow-xl rounded-lg p-2 w-48 hidden group-hover:block z-20">
                                        <p className="text-xs font-bold text-slate-400 mb-2 px-2">Select Type:</p>
                                        <div className="grid grid-cols-1 gap-1">
                                            {wicketOptions.map(opt => (
                                                <button key={opt.type} onClick={() => setWicketType(opt.type)} className="text-left px-2 py-1.5 text-sm hover:bg-slate-100 rounded text-slate-700">{opt.label}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-red-700 bg-red-100 px-3 py-1 rounded border border-red-200">{wicketType}</span>
                                    <button onClick={() => { setWicketType('NONE'); setFielderId(''); }} className="p-1 hover:bg-red-200 rounded-full text-red-600"><XCircle size={16}/></button>
                                </div>
                            )}
                        </div>

                        {(wicketType === 'CAUGHT' || wicketType === 'RUN_OUT') && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full max-sm:gap-3">
                                <select className="flex-1 border rounded px-2 py-1.5 text-xs bg-white border-blue-200" value={fielderId} onChange={e => setFielderId(e.target.value)}>
                                    <option value="">Select Fielder...</option>
                                    {bowlingTeam.players?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                {wicketType === 'RUN_OUT' && (
                                    <select className="flex-1 border rounded px-2 py-1.5 text-xs bg-white border-orange-200" value={whoOut} onChange={e => setWhoOut(e.target.value as WhoOut)}>
                                        <option value="STRIKER">Striker Out</option>
                                        <option value="NON_STRIKER">Non-Striker Out</option>
                                    </select>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-2xl mx-auto mb-6">
                    {[0, 1, 2, 3, 4, 6].map((run) => (
                        <button key={run} onClick={() => handleScoreUpdate(run)} className={`py-4 rounded-xl font-bold text-2xl shadow-sm border transition-transform active:scale-95 ${run === 4 ? 'bg-emerald-600 text-white' : run === 6 ? 'bg-emerald-800 text-white' : 'bg-white text-slate-700'}`}>{run}</button>
                    ))}
                </div>
              </div>
            ) : (
                /* INNINGS OVER SUMMARY VIEW */
                <div className="text-center py-12 px-6 border-t border-dashed mt-4 animate-fade-in-up">
                    <div className="text-6xl font-mono font-bold text-slate-300 mb-2">{currentScore.runs}/{currentScore.wickets}</div>
                    <div className="text-slate-400 font-medium mb-8">Overs: {currentScore.overs} / {match.totalOvers}</div>
                    
                    <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 inline-block relative overflow-hidden group">
                        <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity"><Trophy size={120}/></div>
                        <Trophy className="mx-auto text-emerald-500/20 mb-4" size={48} />
                        <p className="text-slate-400 font-black uppercase tracking-widest text-xs mb-1">Status</p>
                        <p className="text-slate-900 font-black text-2xl uppercase tracking-tighter">Innings Over</p>
                        {activeInnings === 'B' && (
                             <div className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-100">Match Completed</div>
                        )}
                    </div>
                </div>
            )}
        </>
      )}
    </div>
  );
};