import { snackbar } from '$lib/components/Snackbar/store';
import type { PollType, PollOptionType, FetchPollsResponse } from './types';
import { polls } from './store';

export async function fetchPolls(courseId: string) {
  const res = await fetch(`/api/poll/${courseId}`);
  return await res.json();
}

export const updatePollStatus = async (pollId: string, status: PollType['status']) => {
  // Not implemented in API yet, but assuming /api/poll/[id] PUT
  const res = await fetch(`/api/poll/${pollId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
  });
  const { error } = await res.json();

  if (error) {
    console.log(error);
    snackbar.error('snackbar.poll.error.updating_poll');
    return;
  }
};

export const togglePollSubmission = async (
  pollId: PollType['id'],
  pollOptionId: PollOptionType['id'],
  groupmemberId: string,
  add: boolean
) => {
  const res = await fetch('/api/poll/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, pollOptionId, add }) // courseId needed?
  });
  const { error } = await res.json();

  if (error) {
    console.log(error);
    snackbar.error('snackbar.poll.error.submitting_poll');
    return;
  }
};

function isOptionSelectedByCurrentUser(option: PollOptionType, groupmemberId: string) {
  return option.selectedBy.some((gmember) => gmember.id === groupmemberId);
}

export function handleVote(pollId: string, groupmemberId: string, author: PollType['author']) {
  return (optionId: string) => {
    // we have the pollId and the optionId
    polls.update((_polls) => {
      return [
        ..._polls.map((poll) => {
          // Prevent user from voting on their own poll
          // if (poll.author.id === currentGroupMember?.id) return poll;

          // Prevent user from voting on a poll that has expired
          if (poll.expiration && new Date(poll.expiration) < new Date()) return poll;

          if (poll.id === pollId) {
            // Prevent user from voting on a poll that the status is not published
            if (poll.status !== 'published') {
              snackbar.info('snackbar.poll.info.not_published');
              return poll;
            }

            // Prevent user from voting twice
            if (
              poll.options.some((option) => isOptionSelectedByCurrentUser(option, groupmemberId))
            ) {
              snackbar.info('snackbar.poll.info.vote_once');
              return poll;
            }

            poll.options = poll.options.map((option) => {
              const isSelected = isOptionSelectedByCurrentUser(option, groupmemberId);

              // If user has not voted on this option, add their vote
              if (option.id === optionId && !isSelected) {
                option.selectedBy = [...option.selectedBy, author];

                togglePollSubmission(pollId, optionId, groupmemberId, true);
              }
              // else if (isSelected) {
              //   // If user has voted on this option, remove their vote
              //   option.selectedBy = option.selectedBy.filter(
              //     (gmember) => gmember.id !== groupmemberId
              //   );
              // }

              return option;
            });
          }

          return poll;
        })
      ];
    });
  };
}
