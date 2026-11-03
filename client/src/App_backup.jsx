import BookmarkSection from "./components/BookmarkSection";
import { useEffect, useMemo, useRef, useState } from "react";
import CommentSection from "./components/CommentSection";
import ReactionSection from "./components/ReactionSection";
import ProfileSection from "./components/ProfileSection";
import "./App.css";

const API = "http://localhost:5001/api";
const POSTS_PER_PAGE = 5;

const CATEGORIES = [
  "All",
  "Technology",
  "Education",
  "Lifestyle",
  "Travel",
  "General",
];

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("blogToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("blogUser")) || null;
    } catch {
      return null;
    }
  });

  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [posts, setPosts] = useState([]);
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newNotification, setNewNotification] = useState(null);
  const previousNotificationIds = useRef([]);
  const shownNotificationIds = useRef(new Set());
  const notificationAudioContext = useRef(null);
  const notificationPopupTimer = useRef(null);

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  // Create/resume audio directly from the user's bell click.
  function unlockNotificationAudio() {
    try {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return;

      if (!notificationAudioContext.current) {
        notificationAudioContext.current = new AudioContextClass();
      }

      if (notificationAudioContext.current.state === "suspended") {
        notificationAudioContext.current.resume();
      }
    } catch (error) {
      console.log("Notification audio could not be unlocked:", error);
    }
  }

  // Play a short chime using the already-unlocked audio context.
  function playNotificationSound() {
    try {
      const audioContext = notificationAudioContext.current;
      if (!audioContext) return;

      const playTone = () => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.12,
          audioContext.currentTime + 0.03
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          audioContext.currentTime + 0.45
        );

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.46);
      };

      if (audioContext.state === "suspended") {
        audioContext.resume().then(playTone).catch((error) => {
          console.log("Notification sound unavailable:", error);
        });
      } else {
        playTone();
      }
    } catch (error) {
      console.log("Notification sound unavailable:", error);
    }
  }
  const [openComments, setOpenComments] = useState({});
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");

  const [editingPostId, setEditingPostId] = useState(null);

  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [activeView, setActiveView] = useState("explore");
const [readingPostId, setReadingPostId] = useState(null);
// OPEN STORY FROM SHARED LINK
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get("story");

  if (storyId) {
    setReadingPostId(storyId);
    setActiveView("reading");
  }
}, []);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("inkDarkMode") === "true"
  );

  // DARK MODE
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode
      ? "dark"
      : "light";

    localStorage.setItem("inkDarkMode", String(darkMode));
  }, [darkMode]);

  // LOAD STORIES
  async function loadPosts() {
    try {
      const response = await fetch(`${API}/posts`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load stories.");
      }

      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(
        error.message ||
          "Unable to load stories. Check whether the backend is running."
      );
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  // LOAD SAVED BOOKMARKS
  async function loadBookmarks() {
    if (!token) {
      setBookmarkedPostIds([]);
      return;
    }

    try {
      const response = await fetch(`${API}/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load bookmarks.");
      }

      setBookmarkedPostIds(
        data
          .filter((bookmark) => bookmark.post)
          .map((bookmark) => String(bookmark.post._id))
      );
    } catch (error) {
      console.error("Bookmark loading error:", error);
    }
  }
// LOAD NOTIFICATIONS
  // Initial load prepares the list. Clicking the bell checks for unread
  // notifications that have not yet displayed a popup.
  async function loadNotifications({ notify = false } = {}) {
    if (!token) {
      setNotifications([]);
      previousNotificationIds.current = [];
      shownNotificationIds.current = new Set();
      setNewNotification(null);
      return;
    }

    try {
      const response = await fetch(`${API}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load notifications.");
      }

      const latestNotifications = Array.isArray(data) ? data : [];

      if (notify) {
        const unseenUnread = latestNotifications.filter(
          (item) =>
            !item.isRead &&
            !shownNotificationIds.current.has(String(item._id))
        );

        const previousIds = new Set(previousNotificationIds.current);
        const newlyArrived = latestNotifications.filter(
          (item) => !previousIds.has(String(item._id))
        );

        // Show the newest unread item not shown in a popup yet. This also
        // catches unread items that arrived before the first bell click.
        const notificationToShow = unseenUnread[0] || newlyArrived[0];

        if (notificationToShow) {
          setNewNotification(notificationToShow);

          unseenUnread.forEach((item) => {
            shownNotificationIds.current.add(String(item._id));
          });
          shownNotificationIds.current.add(String(notificationToShow._id));

          playNotificationSound();

          if (notificationPopupTimer.current) {
            window.clearTimeout(notificationPopupTimer.current);
          }

          notificationPopupTimer.current = window.setTimeout(() => {
            setNewNotification(null);
            notificationPopupTimer.current = null;
          }, 5000);
        }
      }

      previousNotificationIds.current = latestNotifications.map(
        (item) => String(item._id)
      );
      setNotifications(latestNotifications);
    } catch (error) {
      console.error("Notification loading error:", error);
      setMessage(error.message || "Unable to load notifications.");
    }
  }

  useEffect(() => {
    loadBookmarks();
  }, [token]);
  useEffect(() => {
  loadNotifications();
}, [token]);

  // ADD OR REMOVE A BOOKMARK
  async function toggleBookmark(postId) {
    if (!token) {
      setMessage("Please log in to bookmark stories.");
      return;
    }

    const alreadyBookmarked =
      bookmarkedPostIds.includes(String(postId));

    try {
      const response = await fetch(`${API}/bookmarks/${postId}`, {
        method: alreadyBookmarked ? "DELETE" : "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Bookmark action failed.");
      }

      setBookmarkedPostIds((current) =>
        alreadyBookmarked
          ? current.filter((id) => id !== String(postId))
          : [...current, String(postId)]
      );

      setMessage(
        alreadyBookmarked
          ? "Bookmark removed successfully!"
          : "Story bookmarked successfully!"
      );
    } catch (error) {
      setMessage(error.message);
    }
  }
// SHARE STORY
async function shareStory(post) {
  const storyUrl = `${window.location.origin}${window.location.pathname}?story=${post._id}`;

  try {
    if (navigator.share) {
      await navigator.share({
        title: post.title,
        text: `Read this story on Ink & Ideas: ${post.title}`,
        url: storyUrl,
      });
    } else {
      await navigator.clipboard.writeText(storyUrl);
      setMessage("Story link copied successfully!");
    }
  } catch (error) {
    if (error.name !== "AbortError") {
      setMessage("Unable to share the story. Please try again.");
    }
  }
}
  // SEARCH AND CATEGORY FILTERING
  const readingPost = posts.find(
  (post) => String(post._id) === String(readingPostId)
);
useEffect(() => {
  if (!readingPostId || posts.length === 0) return;

  const storyExists = posts.some(
    (post) => String(post._id) === String(readingPostId)
  );

  if (!storyExists) {
    setMessage("This story could not be found.");
    setActiveView("explore");
    setReadingPostId(null);
    window.history.replaceState({}, "", window.location.pathname);
  }
}, [readingPostId, posts]);
const relatedPosts = readingPost
  ? (() => {
      const otherPosts = posts.filter(
        (post) =>
          String(post._id) !== String(readingPost._id)
      );

      const sameCategoryPosts = otherPosts.filter(
        (post) =>
          (post.category || "General") ===
          (readingPost.category || "General")
      );

      const latestOtherPosts = otherPosts
        .filter(
          (post) =>
            (post.category || "General") !==
            (readingPost.category || "General")
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

      return [
        ...sameCategoryPosts,
        ...latestOtherPosts,
      ].slice(0, 3);
    })()
  : [];
  const filteredPosts = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();

    return posts.filter((post) => {
      const matchesSearch =
        !search ||
        post.title?.toLowerCase().includes(search) ||
        post.content?.toLowerCase().includes(search) ||
        post.author?.username?.toLowerCase().includes(search);

      const matchesCategory =
        selectedCategory === "All" ||
        (post.category || "General") === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [posts, searchQuery, selectedCategory]);

  // PAGINATION
  const totalPages = Math.max(
    1,
    Math.ceil(filteredPosts.length / POSTS_PER_PAGE)
  );

  const visiblePosts = useMemo(() => {
    const start = (page - 1) * POSTS_PER_PAGE;

    return filteredPosts.slice(
      start,
      start + POSTS_PER_PAGE
    );
  }, [filteredPosts, page]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // LOGIN AND REGISTRATION
  async function handleAuth(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const endpoint = isLogin ? "login" : "register";

      const body = isLogin
        ? { email, password }
        : { username, email, password };

      const response = await fetch(`${API}/auth/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (isLogin) {
        localStorage.setItem("blogToken", data.token);
        localStorage.setItem("blogUser", JSON.stringify(data.user));

        setToken(data.token);
        setUser(data.user);
        setMessage("");

        await loadPosts();
      } else {
        setMessage("Registration successful! Please log in.");
        setIsLogin(true);
        setPassword("");
      }
    } catch (error) {
      setMessage(
        error.message === "Failed to fetch"
          ? "Cannot connect to the server. Check that your backend is running."
          : error.message
      );
    } finally {
      setLoading(false);
    }
  }

  // PUBLISH STORY
  async function publishPost(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(`${API}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content,
          category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not publish story.");
      }

      await loadPosts();

      setPage(1);
      setTitle("");
      setContent("");
      setCategory("General");

      setMessage("Your story has been published!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // UPDATE STORY
  async function updatePost(event) {
    event.preventDefault();

    if (!editingPostId) return;

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `${API}/posts/${editingPostId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            content,
            category,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update story.");
      }

      await loadPosts();

      setTitle("");
      setContent("");
      setCategory("General");
      setEditingPostId(null);

      setMessage("Your changes have been saved.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  // START EDITING
  function startEditing(post) {
    setEditingPostId(post._id);
    setTitle(post.title);
    setContent(post.content);
    setCategory(post.category || "General");
    setMessage("");

    setActiveView("explore");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // CANCEL EDITING
  function cancelEditing() {
    setEditingPostId(null);
    setTitle("");
    setContent("");
    setCategory("General");
    setMessage("");
  }

  // DELETE STORY
  async function deletePost(postId) {
    if (
      !window.confirm(
        "Are you sure you want to delete this story?"
      )
    ) {
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `${API}/posts/${postId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete story.");
      }

      setPosts((current) =>
        current.filter((post) => post._id !== postId)
      );

      setBookmarkedPostIds((current) =>
        current.filter((id) => id !== String(postId))
      );

      if (editingPostId === postId) {
        cancelEditing();
      }

      setMessage("Story deleted.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  // LOGOUT
  function logout() {
    localStorage.removeItem("blogToken");
    localStorage.removeItem("blogUser");

    setToken("");
    setUser(null);
    setBookmarkedPostIds([]);
    setNotifications([]);
    previousNotificationIds.current = [];
    setNewNotification(null);
    setShowNotifications(false);
    shownNotificationIds.current = new Set();
    previousNotificationIds.current = [];
    if (notificationPopupTimer.current) {
      window.clearTimeout(notificationPopupTimer.current);
      notificationPopupTimer.current = null;
    }
    setPassword("");
    setMessage("");

    setEditingPostId(null);
    setTitle("");
    setContent("");
    setCategory("General");

    setActiveView("explore");
    setIsLogin(true);
  }

  // LOGIN / REGISTER SCREEN
  if (!token) {
    return (
      <main className="auth-page">
        <div className="auth-decoration auth-decoration-one" />
        <div className="auth-decoration auth-decoration-two" />

        <section className="auth-card">
          <a
            className="brand-lockup"
            href="/"
            aria-label="Ink and Ideas home"
          >
            <span className="brand-mark">i.</span>
            <span>ink <b>&</b> ideas</span>
          </a>

          <p className="auth-kicker">A HOME FOR YOUR WORDS</p>

          <h1>
            {isLogin ? "Welcome back." : "Find your voice."}
          </h1>

          <p className="auth-subtitle">
            {isLogin
              ? "Your next great idea starts right here."
              : "Create an account and share something meaningful."}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={isLogin ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setIsLogin(true);
                setMessage("");
              }}
            >
              Sign in
            </button>

            <button
              type="button"
              className={!isLogin ? "auth-tab active" : "auth-tab"}
              onClick={() => {
                setIsLogin(false);
                setMessage("");
              }}
            >
              Create account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuth}>
            {!isLogin && (
              <label>
                Username
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  minLength={3}
                  maxLength={30}
                  placeholder="Choose a username"
                  required
                />
              </label>
            )}

            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </label>

            <button
              className="primary-button auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Please wait…"
                : isLogin
                  ? "Sign in to your space"
                  : "Create my account"}
            </button>
          </form>

          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}

          <p className="auth-footnote">
            Write freely. Share boldly. Inspire others.
          </p>
        </section>
      </main>
    );
  }
    // MAIN APPLICATION
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <a
            className="brand-lockup"
            href="/"
            aria-label="Ink and Ideas home"
          >
            <span className="brand-mark">i.</span>
            <span>ink <b>&</b> ideas</span>
          </a>

          {/* MAIN NAVIGATION */}
          <nav className="topbar-nav" aria-label="Main navigation">
            <button
              type="button"
              className={`nav-link ${
                activeView === "explore" ? "active" : ""
              }`}
              onClick={() => setActiveView("explore")}
            >
              Explore
            </button>

            <button
              type="button"
              className={`nav-link ${
                activeView === "profile" ? "active" : ""
              }`}
              onClick={() => setActiveView("profile")}
            >
              My Profile
            </button>

            <button
              type="button"
              className={`nav-link ${
                activeView === "bookmarks" ? "active" : ""
              }`}
              onClick={() => setActiveView("bookmarks")}
            >
              🔖 My Bookmarks
            </button>
            <button
              type="button"
              className={`nav-link ${
                activeView === "notifications" ? "active" : ""
              }`}
              onClick={() => {
                // Unlock audio synchronously during the user's click.
                unlockNotificationAudio();
                setActiveView("notifications");
                setShowNotifications(true);
                loadNotifications({ notify: true });
              }}
            >
              🔔 Notifications

              {unreadNotificationCount > 0 && (
                <span className="notification-badge">
                  {unreadNotificationCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className="nav-link"
              onClick={() => {
                setActiveView("explore");
                setTimeout(() => {
                  document.getElementById("write")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }, 100);
              }}
            >
              Write
            </button>
          </nav>

          {/* USER DETAILS */}
          <div className="topbar-user">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setDarkMode((value) => !value)}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {darkMode ? "☀" : "☾"}
            </button>

            <span className="user-avatar">
              {(user?.username || "U").charAt(0).toUpperCase()}
            </span>

            <span className="user-greeting">
              Hi, {user?.username || "writer"}
            </span>

            <button
              className="text-button"
              type="button"
              onClick={logout}
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {newNotification && (
        <aside
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            top: "90px",
            right: "24px",
            zIndex: 9999,
            width: "min(360px, calc(100vw - 32px))",
            padding: "18px",
            borderRadius: "14px",
            background: darkMode ? "#242424" : "#ffffff",
            color: darkMode ? "#ffffff" : "#222222",
            border: "1px solid rgba(128, 128, 128, 0.3)",
            boxShadow: "0 12px 35px rgba(0, 0, 0, 0.18)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "8px",
            }}
          >
            <strong>🔔 New notification</strong>
            <button
              type="button"
              onClick={() => setNewNotification(null)}
              aria-label="Close notification popup"
              style={{
                border: 0,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                fontSize: "20px",
              }}
            >
              ×
            </button>
          </div>
          <p style={{ margin: "0 0 6px" }}>
            <strong>
              {newNotification.sender?.username || "Someone"}
            </strong>{" "}
            {newNotification.message || "interacted with your story."}
          </p>
          <small>{newNotification.post?.title || "Your story"}</small>
        </aside>
      )}

      <div className="main-container">

                {/* PROFILE PAGE */}
        {activeView === "profile" ? (
          <ProfileSection
            token={token}
            user={user}
            onUserUpdated={(updatedUser) => {
              setUser(updatedUser);
              localStorage.setItem(
                "blogUser",
                JSON.stringify(updatedUser)
              );
            }}
          />
        ) : activeView === "reading" ? (
          readingPost ? (
            <article className="full-story-page">

              <button
                type="button"
                className="back-to-explore"
                onClick={() => {
                  setActiveView("explore");
                  setReadingPostId(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                ← Back to Explore
              </button>

              <div className="full-story-header">

                <span className="story-label">
                  {readingPost.category || "General"}
                </span>

                <h1>{readingPost.title}</h1>

                <div className="full-story-meta">
                  <span>
                    By {readingPost.author?.username || "Unknown author"}
                  </span>

                  <span>
                    {new Date(readingPost.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </span>
                </div>

              </div>

              <div className="full-story-content">
                {readingPost.content}
              </div>

              <div className="full-story-actions">

                <ReactionSection
                  postId={readingPost._id}
                  token={token}
                />

                <button
                  type="button"
                  className="comment-toggle"
                  onClick={() => {
                    setOpenComments((previous) => ({
                      ...previous,
                      [readingPost._id]: !previous[readingPost._id],
                    }));
                  }}
                >
                  💬 Comment
                </button>

                <button
                  type="button"
                  className="save-story"
                  onClick={() => toggleBookmark(readingPost._id)}
                >
                  {bookmarkedPostIds.includes(String(readingPost._id))
                    ? "🔖 Saved"
                    : "♧ Save story"}
                </button>
<button
  type="button"
  className="share-story-button"
  onClick={() => shareStory(readingPost)}
>
  ↗ Share Story
</button>
              </div>

              {openComments[readingPost._id] && (
                <div className="comments-wrap">
                  <CommentSection
                    postId={readingPost._id}
                    token={token}
                    user={user}
                  />
                </div>
              )}
{/* RELATED STORIES */}
<section className="related-stories">
  <h2>You might also enjoy</h2>

  {relatedPosts.length > 0 ? (
    <div className="related-stories-grid">
      {relatedPosts.map((post) => (
        <div className="related-story-card" key={post._id}>
          <span className="story-label">
            {post.category || "General"}
          </span>

          <h3>{post.title}</h3>

          <p className="story-preview">
            {post.content}
          </p>

          <button
            type="button"
            onClick={() => {
              setReadingPostId(post._id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            Read Full Story →
          </button>
        </div>
      ))}
    </div>
  ) : (
    <p>No related stories available yet.</p>
  )}
</section>
            </article>
            
          ) : (
            <section className="empty-state">
              <h3>Story not found.</h3>
              <button
                type="button"
                className="primary-button"
                onClick={() => setActiveView("explore")}
              >
                Back to Explore
              </button>
            </section>
          )
                ) : activeView === "bookmarks" ? (
          <BookmarkSection token={token} />
        ) : activeView === "notifications" ? (
          <section className="notifications-page">

            <div className="notifications-heading">
              <div>
                <span className="section-kicker">YOUR ACTIVITY</span>
                <h1>Notifications 🔔</h1>
                <p>Stay updated with what's happening to your stories.</p>
              </div>

              {unreadNotificationCount > 0 && (
                <button
                  type="button"
                  className="mark-read-button"
                  onClick={async () => {
                    try {
                      const response = await fetch(
                        `${API}/notifications/read-all`,
                        {
                          method: "PUT",
                          headers: {
                            Authorization: `Bearer ${token}`,
                          },
                        }
                      );

                      if (!response.ok) {
                        throw new Error("Unable to mark notifications as read.");
                      }

                      setNotifications((previous) =>
                        previous.map((item) => ({
                          ...item,
                          isRead: true,
                        }))
                      );
                    } catch (error) {
                      setMessage(error.message);
                    }
                  }}
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🔔</span>
                <h3>No notifications yet.</h3>
                <p>When someone interacts with your stories, you'll see it here.</p>
              </div>
            ) : (
              <div className="notifications-list">
                {notifications.map((notification) => (
                  <div
                    key={notification._id}
                    className={`notification-card ${
                      notification.isRead ? "read" : "unread"
                    }`}
                  >
                    <span className="notification-icon">
                      {notification.type === "like"
                        ? "❤️"
                        : notification.type === "dislike"
                          ? "👎"
                          : "💬"}
                    </span>

                    <div className="notification-details">
                      <p>
                        <strong>
                          {notification.sender?.username || "Someone"}
                        </strong>{" "}
                        {notification.message}
                      </p>

                      <span>
                        {notification.post?.title || "Story"}
                      </span>

                      <small>
                        {new Date(notification.createdAt).toLocaleString()}
                      </small>

                      
                    </div>

                    {!notification.isRead && (
                      <span className="unread-dot" />
                    )}
                  </div>
                ))}
              </div>
            )}

          </section>
        ) : (
          <>

            {/* HERO SECTION */}
            <section className="hero-panel">
              <div className="hero-copy">
                <span className="eyebrow">
                  <span className="eyebrow-dot" />
                  YOUR CREATIVE CORNER
                </span>

                <h1>
                  Ideas become stories.
                  <br />
                  <em>Stories become something.</em>
                </h1>

                <p>
                  A thoughtful space to write, discover, and
                  connect through the words that matter.
                </p>

                <a className="hero-link" href="#write">
                  Share your story <span>↗</span>
                </a>
              </div>

              <div className="hero-art" aria-hidden="true">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />

                <div className="art-paper">
                  <span>the art of</span>
                  <strong>
                    being
                    <br />
                    heard.
                  </strong>
                  <i>INK & IDEAS · VOL. 01</i>
                </div>

                <span className="art-spark spark-one">✳</span>
                <span className="art-spark spark-two">✦</span>
              </div>
            </section>

            <div className="content-layout">
              <div className="feed-column">

                {/* STORY HEADING */}
                <section className="section-heading" id="stories">
                  <div>
                    <span className="section-kicker">
                      THE COMMUNITY
                    </span>
                    <h2>Stories worth a moment.</h2>
                  </div>

                  <span className="story-total">
                    {filteredPosts.length}{" "}
                    {filteredPosts.length === 1 ? "story" : "stories"}
                  </span>
                </section>

                {message && (
                  <p className="notice page-notice" role="status">
                    {message}
                  </p>
                )}

                {/* SEARCH */}
                <div className="story-search">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search stories, authors, or ideas..."
                    aria-label="Search stories"
                  />
                </div>

                {/* CATEGORY FILTER */}
                <div className="category-filters">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={
                        selectedCategory === item
                          ? "category-filter active"
                          : "category-filter"
                      }
                      onClick={() => setSelectedCategory(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {/* STORY LIST */}
                {filteredPosts.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">✎</span>

                    <h3>
                      {posts.length === 0
                        ? "Your reading list starts here."
                        : "No stories found."}
                    </h3>

                    <p>
                      {posts.length === 0
                        ? "No stories have been published yet. Be the first to share one."
                        : "Try another search or choose a different category."}
                    </p>

                    {posts.length === 0 && (
                      <a href="#write" className="primary-button">
                        Write the first story
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="story-list">
                    {visiblePosts.map((post) => {
                      const isAuthor =
                        user &&
                        post.author &&
                        String(post.author._id) === String(user.id);

                      const isBookmarked =
                        bookmarkedPostIds.includes(String(post._id));

                      return (
                        <article
                          className="story-card"
                          key={post._id}
                        >
                          <div className="story-meta-row">
                            <div className="author-block">
                              <span className="author-avatar">
                                {(post.author?.username || "W")
                                  .charAt(0)
                                  .toUpperCase()}
                              </span>

                              <div>
                                <strong>
                                  {post.author?.username ||
                                    "Unknown author"}
                                </strong>

                                <span>
                                  {new Date(
                                    post.createdAt
                                  ).toLocaleDateString(undefined, {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>

                            {isAuthor && (
                              <div className="story-owner-actions">
                                <button
                                  type="button"
                                  onClick={() => startEditing(post)}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="delete-text"
                                  onClick={() => deletePost(post._id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="story-body">
                            <span className="story-label">
                              {post.category || "General"}
                            </span>

                            <h3>
  <button
    type="button"
    className="story-title-button"
    onClick={() => {
      setReadingPostId(post._id);
      setActiveView("reading");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }}
  >
    {post.title}
  </button>
</h3>
                            <p className="story-preview">
  {post.content}
</p>
                            <button
  type="button"
  className="read-story-button"
  onClick={() => {
    setReadingPostId(post._id);
    setActiveView("reading");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
>
  Read Full Story →
</button>
                          </div>

                          {/* REACTIONS */}
                          <div className="story-interactions">
                            <ReactionSection
                              postId={post._id}
                              token={token}
                            />

                            <button
  type="button"
  className={`comment-toggle ${
    openComments[post._id] ? "active" : ""
  }`}
  onClick={() => {
    setOpenComments((previous) => ({
      ...previous,
      [post._id]: !previous[post._id],
    }));
  }}
>
  💬
  <span>Comment</span>
</button>

                            {/* BOOKMARK BUTTON */}
                            <button
                              className={`save-story ${
                                isBookmarked ? "bookmarked" : ""
                              }`}
                              type="button"
                              onClick={() => toggleBookmark(post._id)}
                              aria-label={
                                isBookmarked
                                  ? "Remove bookmark"
                                  : "Save story"
                              }
                              title={
                                isBookmarked
                                  ? "Remove bookmark"
                                  : "Save story"
                              }
                            >
                              {isBookmarked ? "🔖" : "♧"}
                            </button>
                          </div>

                          {/* COMMENTS */}
                          {openComments[post._id] && (
  <div
    id={`comments-${post._id}`}
    className="comments-wrap"
  >
    <CommentSection
      postId={post._id}
      token={token}
      user={user}
    />
  </div>
)}
                        </article>
                      );
                    })}
                  </div>
                )}
                                {/* PAGINATION */}
                {filteredPosts.length > POSTS_PER_PAGE && (
                  <nav
                    className="pagination"
                    aria-label="Story pages"
                  >
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => {
                        setPage((p) => p - 1);
                        document
                          .getElementById("stories")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      ← Previous
                    </button>

                    <span>
                      Page <strong>{page}</strong> of{" "}
                      <strong>{totalPages}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => {
                        setPage((p) => p + 1);
                        document
                          .getElementById("stories")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      Next →
                    </button>
                  </nav>
                )}
              </div>

              {/* WRITE STORY SIDEBAR */}
              <aside className="sidebar">
                <section className="write-card" id="write">
                  <span className="write-icon">✎</span>

                  <span className="section-kicker">
                    {editingPostId
                      ? "MAKE IT BETTER"
                      : "YOUR NEXT CHAPTER"}
                  </span>

                  <h2>
                    {editingPostId
                      ? "Edit your story."
                      : "Have something to say?"}
                  </h2>

                  <p>
                    {editingPostId
                      ? "Polish your words and save your changes."
                      : "The world could use your point of view. Put it into words."}
                  </p>

                  <form
                    className="composer-form"
                    onSubmit={
                      editingPostId ? updatePost : publishPost
                    }
                  >
                    <label htmlFor="story-title">
                      Story title
                    </label>

                    <input
                      id="story-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={150}
                      placeholder="Give it a title…"
                      required
                    />

                    <label htmlFor="story-category">
                      Story category
                    </label>

                    <select
                      id="story-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      {CATEGORIES.filter(
                        (item) => item !== "All"
                      ).map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="story-content">
                      Your story
                    </label>

                    <textarea
                      id="story-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      maxLength={20000}
                      rows={7}
                      placeholder="Start with a thought…"
                      required
                    />

                    <span className="character-count">
                      {content.length.toLocaleString()} / 20,000
                      characters
                    </span>

                    <button
                      className="primary-button publish-button"
                      type="submit"
                      disabled={loading}
                    >
                      {loading
                        ? "Please wait…"
                        : editingPostId
                          ? "Save changes →"
                          : "Publish story →"}
                    </button>

                    {editingPostId && (
                      <button
                        className="cancel-button"
                        type="button"
                        onClick={cancelEditing}
                      >
                        Cancel editing
                      </button>
                    )}
                  </form>
                </section>

                <div className="sidebar-note">
                  <span>✦ A LITTLE REMINDER</span>

                  <p>
                    “There is no greater agony than bearing an
                    untold story inside you.”
                  </p>

                  <small>— Maya Angelou</small>
                </div>
              </aside>
            </div>

            {/* FOOTER */}
            <footer className="site-footer">
              <span>
                ink <b>&</b> ideas
              </span>

              <span>
                Made for the stories only you can tell.
              </span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}

export default App;