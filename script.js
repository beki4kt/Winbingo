// Initialize Supabase Client in JS
const _supabase = supabase.createClient('SUPABASE_URL', 'SUPABASE_ANON_KEY');

// Listen for new wins globally
_supabase
  .channel('live_wins')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'history' }, payload => {
    const { user_id, amount, action } = payload.new;
    if (action === "Bingo Win") {
        showLiveToast(`🔥 Player ${user_id} just won ${amount} coins!`);
    }
  })
  .subscribe();

function showLiveToast(message) {
    const ticker = document.getElementById('news-ticker');
    ticker.innerText = message;
    ticker.classList.add('fade-in');
}