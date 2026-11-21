
import { useEffect, useRef, useState } from "react";

const API = "http://localhost:5001/api";
const SERVER = "http://localhost:5001";

const defaultStats = {
  totalPosts: 0,
  likesReceived: 0,
  totalCategories: 0,
};

function ProfileSection({ token, user, onUserUpdated }) {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(defaultStats);
  const [posts, setPosts] = useState([]);

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || "");
  const [bio, setBio] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // Story editing state
  const [editingPostId, setEditingPostId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("General");
  const [storySaving, setStorySaving] = useState(false);

  function updateMainUser(updatedUser) {
    localStorage.setItem("blogUser", JSON.stringify(updatedUser));

    if (onUserUpdated) {
      onUserUpdated(updatedUser);
    }
  }

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load profile.");
      }

      setProfile(data.user);
      setStats(data.stats || defaultStats);
      setPosts(data.posts || []);

      setUsername(data.user.username || "");
      setBio(data.user.bio || "");

      // Keep the main application user data updated.
      updateMainUser({
        ...user,
        ...data.user,
        profilePicture:
          data.user.profilePicture || user?.profilePicture || "",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadProfile();
    }
  }, [token]);

  // Build the full image URL.
  const profilePictureUrl = profile?.profilePicture
    ? profile.profilePicture.startsWith("http")
      ? profile.profilePicture
      : `${SERVER}${profile.profilePicture}`
    : "";

  // Upload profile picture.
  async function uploadProfilePicture(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    try {
      setUploading(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append("profilePicture", file);

      const response = await fetch(`${API}/profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Picture upload failed.");
      }

      if (!data.profilePicture) {
        throw new Error("Upload succeeded, but no image path was returned.");
      }

      const updatedProfile = {
        ...profile,
        profilePicture: data.profilePicture,
      };

      setProfile(updatedProfile);
      setImageError(false);

      const updatedUser = {
        ...user,
        ...updatedProfile,
        profilePicture: data.profilePicture,
      };

      updateMainUser(updatedUser);

      setMessage("Profile picture updated successfully!");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  // Save username and bio.
  async function saveProfile(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API}/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username, bio }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update profile.");
      }

      const updatedProfile = {
        ...profile,
        ...data.user,
        profilePicture:
          data.user.profilePicture || profile?.profilePicture || "",
      };

      setProfile(updatedProfile);

      updateMainUser({
        ...user,
        ...updatedProfile,
      });

      setEditing(false);
      setMessage("Your profile has been updated!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Start editing a story.
  function startEditingStory(post) {
    setEditingPostId(post._id);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditCategory(post.category || "General");
    setMessage("");
    setError("");
  }

  // Save edited story.
  async function saveStory(event) {
    event.preventDefault();

    try {
      setStorySaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API}/posts/${editingPostId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          content: editContent,
          category: editCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update story.");
      }

      setPosts((previousPosts) =>
        previousPosts.map((post) =>
          post._id === editingPostId
            ? { ...post, ...data.post }
            : post
        )
      );

      setEditingPostId(null);
      setMessage("Your story has been updated!");
    } catch (err) {
      setError(err.message);
    } finally {
      setStorySaving(false);
    }
  }

  // Delete a story.
  async function deleteStory(postId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this story?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(`${API}/posts/${postId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to delete story.");
      }

      setPosts((previousPosts) =>
        previousPosts.filter((post) => post._id !== postId)
      );

      setStats((previousStats) => ({
        ...previousStats,
        totalPosts: Math.max(0, previousStats.totalPosts - 1),
      }));

      setMessage("Your story has been deleted!");
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) {
    return (
      <section className="profile-page">
        <p>Loading your profile...</p>
      </section>
    );
  }

  if (error && !profile) {
    return (
      <section className="profile-page">
        <p className="profile-error">{error}</p>
        <button className="primary-button" onClick={loadProfile}>
          Try again
        </button>
      </section>
    );
  }

  return (
    <section className="profile-page">
      {/* Instagram-style profile header */}
      <div className="profile-header-card">
        <div className="profile-cover">
          <span>✦ INK & IDEAS ✦</span>
        </div>

        <div className="profile-main-info">
          <div className="profile-avatar-wrapper">
            <div className="profile-avatar">
              {profilePictureUrl && !imageError ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="profile-avatar-image"
                  onError={() => setImageError(true)}
                />
              ) : (
                (profile?.username || "U").charAt(0).toUpperCase()
              )}
            </div>

            <button
              type="button"
              className="profile-picture-upload"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Change profile picture"
            >
              {uploading ? "..." : "📷"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadProfilePicture}
              hidden
            />
          </div>

          <div className="profile-identity">
            <h1>{profile?.username}</h1>
            <p>{profile?.email}</p>
            <span className="profile-member-label">
              INK & IDEAS MEMBER
            </span>
          </div>

          <button
            className="profile-edit-button"
            type="button"
            onClick={() => {
              setUsername(profile?.username || "");
              setBio(profile?.bio || "");
              setEditing(!editing);
              setMessage("");
              setError("");
            }}
          >
            {editing ? "Cancel" : "✎ Edit Profile"}
          </button>
        </div>

        <p className="profile-bio">
          {profile?.bio || "Welcome to my Ink & Ideas profile!"}
        </p>

        <p className="profile-joined">
          Member since{" "}
          {profile?.joinedAt
            ? new Date(profile.joinedAt).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })
            : "recently"}
        </p>
      </div>

      {message && <p className="profile-success">{message}</p>}
      {error && <p className="profile-error">{error}</p>}

      {/* Edit profile form */}
      {editing && (
        <form className="profile-edit-form" onSubmit={saveProfile}>
          <h2>Edit your profile</h2>

          <label htmlFor="profile-username">Username</label>
          <input
            id="profile-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            required
          />

          <label htmlFor="profile-bio">About me</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={250}
            rows={4}
            placeholder="Tell the community something about yourself..."
          />

          <span className="profile-character-count">
            {bio.length}/250 characters
          </span>

          <button
            className="primary-button"
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      {/* Profile statistics */}
      <div className="profile-stats">
        <div className="profile-stat-card">
          <span>✍</span>
          <strong>{stats.totalPosts}</strong>
          <p>Stories Published</p>
        </div>

        <div className="profile-stat-card">
          <span>♥</span>
          <strong>{stats.likesReceived}</strong>
          <p>Likes Received</p>
        </div>

        <div className="profile-stat-card">
          <span>✦</span>
          <strong>{stats.totalCategories}</strong>
          <p>Categories</p>
        </div>
      </div>

      {/* Published stories */}
      <div className="profile-stories-heading">
        <div>
          <span className="section-kicker">YOUR CREATIVE JOURNEY</span>
          <h2>My Published Stories</h2>
        </div>

        <span>{posts.length} stories</span>
      </div>

      {posts.length === 0 ? (
        <div className="profile-empty">
          <span>✎</span>
          <h3>Your story collection is waiting.</h3>
          <p>Publish your first story and it will appear here.</p>
        </div>
      ) : (
        <div className="profile-stories-list">
          {posts.map((post) => (
            <article className="profile-story-card" key={post._id}>
              <div className="profile-story-top">
                <span className="profile-category">
                  {post.category || "General"}
                </span>

                <time>
                  {new Date(post.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
              </div>

              {editingPostId === post._id ? (
                <form className="profile-edit-form" onSubmit={saveStory}>
                  <h3>Edit your story</h3>

                  <label>Story title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={150}
                    required
                  />

                  <label>Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                  >
                    <option value="Technology">Technology</option>
                    <option value="Education">Education</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Travel">Travel</option>
                    <option value="General">General</option>
                  </select>

                  <label>Story content</label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={7}
                    maxLength={20000}
                    required
                  />

                  <button
                    type="submit"
                    className="primary-button"
                    disabled={storySaving}
                  >
                    {storySaving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    className="profile-cancel-button"
                    onClick={() => setEditingPostId(null)}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <h3>{post.title}</h3>

                  <p>
                    {post.content.length > 180
                      ? `${post.content.slice(0, 180)}...`
                      : post.content}
                  </p>

                  <div className="profile-story-actions">
                    <button
                      type="button"
                      onClick={() => startEditingStory(post)}
                    >
                      ✎ Edit Story
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteStory(post._id)}
                    >
                      🗑 Delete Story
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProfileSection;
