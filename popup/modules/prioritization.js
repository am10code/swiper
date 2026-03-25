(function () {
  function createPrioritizationEngine(storage) {
    if (!storage) {
      throw new Error('Storage is required for prioritization engine');
    }

    var session = null;

    function normalizeUrgency(value) {
      return value === 'high' ? 'high' : 'medium';
    }

    function urgencyWeight(value) {
      return normalizeUrgency(value) === 'high' ? 2 : 1;
    }

    function toTimestamp(deadline) {
      if (!deadline) return Number.POSITIVE_INFINITY;
      var parsed = Date.parse(deadline);
      return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
    }

    function compareFallback(a, b) {
      var urgencyDiff = urgencyWeight(b.priority) - urgencyWeight(a.priority);
      if (urgencyDiff !== 0) return urgencyDiff;

      var deadlineA = toTimestamp(a.deadline);
      var deadlineB = toTimestamp(b.deadline);
      if (deadlineA !== deadlineB) return deadlineA - deadlineB;

      return Number(b.createdAt || 0) - Number(a.createdAt || 0);
    }

    function isRanked(task) {
      return Number.isFinite(task.priorityRank) && Number(task.priorityRank) > 0;
    }

    function buildSession(tasks) {
      var activeTasks = tasks.filter(function (task) {
        return task && task.completed !== true;
      });

      var ranked = activeTasks
        .filter(isRanked)
        .sort(function (a, b) {
          var rankDiff = Number(a.priorityRank) - Number(b.priorityRank);
          if (rankDiff !== 0) return rankDiff;
          return compareFallback(a, b);
        });

      var unranked = activeTasks
        .filter(function (task) {
          return !isRanked(task);
        })
        .sort(compareFallback);

      if (unranked.length === 0) {
        return null;
      }

      var byId = new Map();
      tasks.forEach(function (task) {
        byId.set(task.id, task);
      });

      return {
        byId: byId,
        allTasks: tasks.slice(),
        orderedIds: ranked.map(function (task) { return task.id; }),
        queue: unranked.map(function (task) { return task.id; }),
        currentCandidateId: null,
        low: 0,
        high: 0,
        mid: 0,
        currentReferenceId: null,
        votesDone: 0,
        votesPlanned: 0,
        done: false
      };
    }

    function estimateVotes(orderedCount, queueCount) {
      var count = orderedCount;
      var votes = 0;
      for (var i = 0; i < queueCount; i += 1) {
        var size = Math.max(1, count);
        votes += Math.ceil(Math.log2(size + 1));
        count += 1;
      }
      return votes;
    }

    function setNextComparison() {
      if (!session) return;

      while (session.currentCandidateId === null && session.queue.length > 0) {
        session.currentCandidateId = session.queue.shift();
        session.low = 0;
        session.high = session.orderedIds.length;
      }

      if (session.currentCandidateId === null) {
        session.done = true;
        session.currentReferenceId = null;
        return;
      }

      if (session.low >= session.high) {
        session.orderedIds.splice(session.low, 0, session.currentCandidateId);
        session.currentCandidateId = null;
        session.currentReferenceId = null;
        setNextComparison();
        return;
      }

      session.mid = Math.floor((session.low + session.high) / 2);
      session.currentReferenceId = session.orderedIds[session.mid];
    }

    function getSnapshot() {
      if (!session) {
        return {
          active: false,
          done: true,
          pair: null,
          votesDone: 0,
          votesPlanned: 0,
          remainingUnranked: 0
        };
      }

      var pair = null;
      if (!session.done && session.currentCandidateId && session.currentReferenceId) {
        pair = {
          first: session.byId.get(session.currentCandidateId) || null,
          second: session.byId.get(session.currentReferenceId) || null
        };
      }

      return {
        active: !session.done,
        done: session.done,
        pair: pair,
        votesDone: session.votesDone,
        votesPlanned: session.votesPlanned,
        remainingUnranked: session.queue.length + (session.currentCandidateId ? 1 : 0),
        rankedCount: session.orderedIds.length
      };
    }

    async function start(tasks) {
      session = buildSession(tasks || []);
      if (!session) {
        return getSnapshot();
      }
      session.votesPlanned = estimateVotes(session.orderedIds.length, session.queue.length);
      setNextComparison();
      return getSnapshot();
    }

    async function choose(preferredTaskId) {
      if (!session || session.done) {
        return getSnapshot();
      }
      if (!session.currentCandidateId || !session.currentReferenceId) {
        throw new Error('No active comparison');
      }

      var candidateId = session.currentCandidateId;
      var referenceId = session.currentReferenceId;
      if (preferredTaskId !== candidateId && preferredTaskId !== referenceId) {
        throw new Error('Preferred task is not part of current comparison');
      }

      session.votesDone += 1;

      if (preferredTaskId === candidateId) {
        session.high = session.mid;
      } else {
        session.low = session.mid + 1;
      }

      setNextComparison();

      if (session.done) {
        await persistRanks();
      }

      return getSnapshot();
    }

    async function persistRanks() {
      if (!session) return;

      var rankById = new Map();
      session.orderedIds.forEach(function (taskId, index) {
        rankById.set(taskId, index + 1);
      });

      var updatedTasks = session.allTasks.map(function (task) {
        if (task.completed === true) return task;
        var nextRank = rankById.get(task.id);
        return {
          ...task,
          priorityRank: Number.isFinite(nextRank) ? nextRank : null
        };
      });

      await storage.saveTasks(updatedTasks);
    }

    function hasUnrankedTasks(tasks) {
      return (tasks || []).some(function (task) {
        return task && task.completed !== true && !isRanked(task);
      });
    }

    function reset() {
      session = null;
    }

    return {
      start: start,
      choose: choose,
      getSnapshot: getSnapshot,
      hasUnrankedTasks: hasUnrankedTasks,
      reset: reset
    };
  }

  window.createPrioritizationEngine = createPrioritizationEngine;
})();
