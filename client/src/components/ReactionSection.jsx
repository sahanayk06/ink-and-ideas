import { useEffect, useState } from "react";

const API_URL = "http://localhost:5001/api/reactions";

function ReactionSection({ postId, token }) {
  const [likes, setLikes] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadReactions() {
      try {
        const response = await fetch(`${API_URL}/${postId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load likes.");
        if (!cancelled) {
          setLikes(data.likes ?? 0);
          setUserReaction(data.userReaction || null);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    loadReactions();
    return () => { cancelled = true; };
  }, [postId, token]);

  async function handleLike() {
    if (!token) {
      setError("Please log in to like this story.");
      return;
    }
    if (loading) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type: "like" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to save your like.");
      setLikes(data.likes ?? 0);
      setUserReaction(data.userReaction || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reaction-widget">
      <button
        type="button"
        className={`heart-button ${userReaction === "like" ? "is-liked" : ""}`}
        onClick={handleLike}
        disabled={loading}
        aria-label={userReaction === "like" ? "Unlike story" : "Like story"}
        aria-pressed={userReaction === "like"}
        title={userReaction === "like" ? "Unlike" : "Like"}
      >
        {userReaction === "like" ? "♥" : "♡"}
      </button>
      <strong className="like-total">{likes.toLocaleString()}</strong>
      <span className="like-label">{likes === 1 ? "like" : "likes"}</span>
      {error && <span className="reaction-error" role="alert">{error}</span>}
    </div>
  );
}

export default ReactionSection;
