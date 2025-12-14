document.addEventListener('DOMContentLoaded', () => {
  const activitiesList = document.getElementById('activities-list');
  const activitySelect = document.getElementById('activity');
  const form = document.getElementById('signup-form');
  const message = document.getElementById('message');

  function showMessage(text, type = 'info') {
    message.className = `message ${type}`;
    message.textContent = text;
    message.classList.remove('hidden');
    setTimeout(() => message.classList.add('hidden'), 3500);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderActivities(data) {
    activitiesList.innerHTML = '';
    activitySelect.querySelectorAll('option[value]').forEach(o => o.remove());

    Object.keys(data).forEach(name => {
      const a = data[name];
      // card
      const card = document.createElement('div');
      card.className = 'activity-card';

      const title = document.createElement('h4');
      title.textContent = name;
      card.appendChild(title);

      const desc = document.createElement('p');
      desc.textContent = a.description || '';
      card.appendChild(desc);

      const sched = document.createElement('p');
      sched.innerHTML = `<strong>Schedule:</strong> ${escapeHtml(a.schedule || '')}`;
      card.appendChild(sched);

      const max = document.createElement('p');
      max.innerHTML = `<strong>Max participants:</strong> ${escapeHtml(String(a.max_participants || ''))}`;
      card.appendChild(max);

      // participants section
      const participantsSection = document.createElement('div');
      participantsSection.className = 'participants-section';
      const partTitle = document.createElement('h5');
      partTitle.textContent = 'Participants';
      participantsSection.appendChild(partTitle);

      if (Array.isArray(a.participants) && a.participants.length) {
        const ul = document.createElement('ul');
        ul.className = 'participants-list';
        a.participants.forEach(p => {
          const li = document.createElement('li');
          const span = document.createElement('span');
          span.className = 'participant-chip';
          span.textContent = p;
          const btn = document.createElement('button');
          btn.className = 'remove-btn';
          btn.setAttribute('aria-label', `Remove ${p}`);
          btn.dataset.email = p;
          btn.textContent = '✕';
          li.appendChild(span);
          li.appendChild(btn);
          ul.appendChild(li);
        });
        participantsSection.appendChild(ul);
      } else {
        const empty = document.createElement('p');
        empty.className = 'info';
        empty.textContent = 'No participants yet.';
        participantsSection.appendChild(empty);
      }

      card.appendChild(participantsSection);
      activitiesList.appendChild(card);

      // add option
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  // fetch and render on load
  fetch('/activities')
    .then(res => {
      if (!res.ok) throw new Error('Failed to load activities');
      return res.json();
    })
    .then(renderActivities)
    .catch(() => {
      activitiesList.innerHTML = '<p class="error">Unable to load activities right now.</p>';
    });

  // signup handler
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const activity = activitySelect.value;
    if (!email || !activity) {
      showMessage('Please provide an email and select an activity.', 'error');
      return;
    }

    showMessage('Signing up...', 'info');
    fetch(`/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`, {
      method: 'POST'
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || 'Signup failed');
        }
        return res.json();
      })
      .then(() => {
        // refresh activities from server to ensure UI matches backend state
        fetch('/activities')
          .then(res => {
            if (!res.ok) throw new Error('Failed to reload activities');
            return res.json();
          })
          .then(renderActivities)
          .then(() => {
            showMessage(`Signed up ${email} for ${activity}`, 'success');
            form.reset();
          })
          .catch(err => showMessage(err.message || 'Signup succeeded but failed to refresh UI', 'error'));
      })
      .catch(err => showMessage(err.message || 'Signup failed', 'error'));
  });

  // Delegate click handler for remove buttons
  activitiesList.addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.remove-btn');
    if (!btn) return;

    const li = btn.closest('li');
    const card = btn.closest('.activity-card');
    if (!card || !li) return;

    const activity = card.querySelector('h4') && card.querySelector('h4').textContent;
    const email = btn.dataset.email;
    if (!activity || !email) return;

    if (!confirm(`Remove ${email} from ${activity}?`)) return;

    fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
      method: 'DELETE'
    })
      .then(async res => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || 'Failed to remove participant');
        }
        return res.json();
      })
      .then(() => {
        // refresh activities from server to reflect removal
        fetch('/activities')
          .then(res => {
            if (!res.ok) throw new Error('Failed to reload activities');
            return res.json();
          })
          .then(renderActivities)
          .then(() => showMessage(`Removed ${email} from ${activity}`, 'success'))
          .catch(err => showMessage(err.message || 'Removed but failed to refresh UI', 'error'));
      })
      .catch(err => showMessage(err.message || 'Failed to remove participant', 'error'));
  });
});
