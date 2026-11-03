
import { useEffect, useState } from "react";

const API = "http://localhost:5001/api";

function BookmarkSection({ token }) {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadBookmarks() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API}/bookmarks`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load bookmarks.");
      }

      setBookmarks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookmarks();
  }, [token]);

  async function removeBookmark(postId) {
    try {
      const response = await fetch(`${API}/bookmarks/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to remove bookmark.");
      }

      setBookmarks((previous) =>
        previous.filter((item) => item.post?._id !== postId)
      );
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return <section className="profile-page">Loading bookmarks...</section>;
  }

  return (
    <section className="profile-page bookmarks-page">
      <div className="profile-stories-heading">
        <div>
          <span className="section-kicker">YOUR SAVED COLLECTION</span>
          <h2>My Bookmarks</h2>
          <p>Stories you love and want to read again.</p>
        </div>

        <span>{bookmarks.length} saved stories</span>
      </div>

      {error && <p className="profile-error">{error}</p>}

      {bookmarks.length === 0 ? (
        <div className="profile-empty">
          <span>🔖</span>
          <h3>No bookmarks yet!</h3>
          <p>Save your favorite stories and find them here.</p>
        </div>
      ) : (
        <div className="profile-stories-list">
          {bookmarks.map((bookmark) => {
            const post = bookmark.post;

            if (!post) return null;

            return (
              <article className="profile-story-card" key={bookmark._id}>
                <div className="profile-story-top">
                  <span className="profile-category">
                    {post.category || "General"}
                  </span>

                  <time>
                    {new Date(post.createdAt).toLocaleDateString()}
                  </time>
                </div>

                <h3>{post.title}</h3>

                <p>
                  {post.content.length > 180
                    ? `${post.content.slice(0, 180)}...`
                    : post.content}
                </p>

                <p>
                  By {post.author?.username || "Unknown author"}
                </p>

                <div className="profile-story-actions">
                  <button
                    type="button"
                    onClick={() => removeBookmark(post._id)}
                  >
                    🔖 Remove Bookmark
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default BookmarkSection;
