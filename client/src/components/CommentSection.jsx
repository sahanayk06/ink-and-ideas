
import { useEffect, useState } from "react";

function CommentSection({ postId, token, user }) {
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");

  const API_URL = "http://localhost:5001/api/comments";

  async function loadComments() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/${postId}`);
      if (!response.ok) throw new Error("Unable to load comments.");

      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComments();
  }, [postId]);

  async function addComment(e) {
    e.preventDefault();

    if (!content.trim() || !token || submitting) return;

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_URL}/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to add comment.");
      }

      setComments((previous) => [data.comment, ...previous]);
      setContent("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm("Delete this comment?")) return;

    try {
      setDeletingId(commentId);
      setError("");

      const response = await fetch(`${API_URL}/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete comment.");
      }

      setComments((previous) =>
        previous.filter((comment) => comment._id !== commentId)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <section className="comment-section" id={`comments-${postId}`}>
      <div className="comment-section-heading">
        <h3>Comments ({comments.length})</h3>
        <p>Share your thoughts and join the conversation.</p>
      </div>

      {token ? (
        <form className="comment-form" onSubmit={addComment}>
          <textarea
            className="comment-input"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your comment..."
            maxLength={1000}
            rows={4}
            required
          />

          <div className="comment-form-footer">
            <span className="comment-character-count">
              {content.length}/1000
            </span>

            <button
              className="comment-submit-button"
              type="submit"
              disabled={!content.trim() || submitting}
            >
              {submitting ? "Adding..." : "Add Comment"}
            </button>
          </div>
        </form>
      ) : (
        <p className="comment-login-note">
          Please log in to write a comment.
        </p>
      )}

      {error && <p className="comment-error">{error}</p>}

      {loading ? (
        <p className="comments-status">Loading comments...</p>
      ) : comments.length === 0 ? (
        <div className="comments-empty">
          <p>No comments yet. Be the first to share your thoughts!</p>
        </div>
      ) : (
        <div className="comments-list">
          {comments.map((comment) => {
            const authorId = comment.author?._id || comment.author?.id;
            const currentUserId = user?.id || user?._id;

            const isAuthor =
              Boolean(currentUserId && authorId) &&
              String(authorId) === String(currentUserId);

            return (
              <article className="comment-card" key={comment._id}>
                <div className="comment-avatar">
                  {(comment.author?.username || "U")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="comment-content">
                  <div className="comment-meta">
                    <strong>
                      {comment.author?.username || "User"}
                    </strong>

                    <time dateTime={comment.createdAt}>
                      {new Date(comment.createdAt).toLocaleString()}
                    </time>
                  </div>

                  <p>{comment.content}</p>

                  {isAuthor && (
                    <button
                      className="comment-delete-button"
                      type="button"
                      onClick={() => deleteComment(comment._id)}
                      disabled={deletingId === comment._id}
                    >
                      {deletingId === comment._id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default CommentSection;
