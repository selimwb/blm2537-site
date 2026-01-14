const API_URL = "http://localhost:3000";

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupLogout();

    if (document.getElementById('blog-grid')) loadBlogPosts();
    if (document.getElementById('admin-posts')) loadAdminPosts();
    if (document.getElementById('login-form')) setupLogin();
    if (document.getElementById('register-form')) setupRegister();
    
    if (document.getElementById('comments-list')) {
        getComments();
        setupCommentForm();
    }
});

function checkAuth() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const navAuth = document.getElementById('nav-auth');
    const adminLink = document.getElementById('admin-link');
    
    if (!navAuth) return;
    
    if (user) {
        navAuth.innerHTML = `<a href="#" id="btn-logout" style="background:#fc8181">Çıkış</a>`;
        if (adminLink && user.role === 'admin') {
            adminLink.style.display = 'inline-block';
        }
    } else {
        navAuth.innerHTML = `<a href="login.html" class="btn-primary" style="padding:8px 15px;">Giriş Yap</a>`;
        if (adminLink) adminLink.style.display = 'none';
    }
}

function setupLogout() {
    document.addEventListener('click', (e) => {
        if (e.target.id === 'btn-logout') {
            e.preventDefault();
            localStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }
    });
}

function setupLogin() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            alert('Lütfen tüm alanları doldurun.');
            return;
        }

        try {
            const res = await fetch(`${API_URL}/users?username=${username}&password=${password}`);
            const users = await res.json();

            if (users.length > 0) {
                localStorage.setItem('currentUser', JSON.stringify(users[0]));
                alert('Giriş başarılı!');
                window.location.href = 'index.html';
            } else {
                alert('Kullanıcı adı veya şifre hatalı!');
            }
        } catch (err) {
            console.error('Login error:', err);
            alert('Sunucu hatası!');
        }
    });
}

function setupRegister() {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;
        const bio = document.getElementById('bio').value.trim();

        if (!fullName || !username || !password) {
            alert('Lütfen tüm gerekli alanları doldurun.');
            return;
        }

        if (password !== passwordConfirm) {
            alert('Şifreler eşleşmiyor!');
            return;
        }

        if (password.length < 4) {
            alert('Şifre en az 4 karakter olmalıdır!');
            return;
        }

        try {
            const checkRes = await fetch(`${API_URL}/users?username=${username}`);
            const existingUsers = await checkRes.json();

            if (existingUsers.length > 0) {
                alert('Bu kullanıcı adı zaten kullanılıyor!');
                return;
            }

            const newUser = { username, password, fullName, bio, role: 'user' };
            const res = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (res.ok) {
                const createdUser = await res.json();
                localStorage.setItem('currentUser', JSON.stringify(createdUser));
                alert('Kayıt başarılı!');
                window.location.href = 'index.html';
            } else {
                alert('Kayıt sırasında hata oluştu!');
            }
        } catch (err) {
            console.error('Register error:', err);
            alert('Sunucu hatası! json-server çalışıyor mu?');
        }
    });
}

async function loadBlogPosts() {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    const urlParams = new URLSearchParams(window.location.search);
    const activeTag = urlParams.get('tag');

    grid.innerHTML = '<div style="text-align:center">Yazılar yükleniyor...</div>';
    
    const header = document.querySelector('header h1');
    if(activeTag && header) {
        header.innerHTML = `Blog Yazılarım <span style="font-size:0.6em; color:#667eea">#${activeTag}</span>`;
    }

    try {
        const res = await fetch(`${API_URL}/posts`);
        if (!res.ok) throw new Error('Yazılar yüklenemedi');
        
        let posts = await res.json();
        
        if (activeTag) {
            posts = posts.filter(post => 
                post.tags && post.tags.includes(activeTag)
            );
        }

        grid.innerHTML = '';
        
        if (posts.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">Bu etikette henüz yazı yok veya sonuç bulunamadı.</p>';
            if(activeTag) grid.innerHTML += `<div style="grid-column: 1/-1; text-align:center;"><a href="blog.html" class="btn-primary">Tüm Yazıları Gör</a></div>`;
            return;
        }

        posts.reverse().forEach(post => {
            const date = new Date(post.date).toLocaleDateString('tr-TR');

            let tagsHtml = '';
            if (post.tags && post.tags.length > 0) {
                tagsHtml = '<div style="margin-top:10px; font-size:0.85rem; color:#667eea;">';
                post.tags.forEach(tag => {
                    tagsHtml += `<span style="margin-right:8px;">#${tag}</span>`;
                });
                tagsHtml += '</div>';
            }

            grid.innerHTML += `
                <div class="blog-card" style="cursor:pointer;" onclick="viewPostDetail('${post.id}')">
                    <h3>${post.title}</h3>
                    <p class="blog-preview">${post.content.substring(0, 150)}...</p>
                    <div class="blog-footer">
                        <span>🖊️ ${post.author || 'Admin'}</span>
                        <span>📅 ${date}</span>
                    </div>
                    ${tagsHtml}
                </div>
            `;
        });
    } catch (err) {
        console.error('Blog posts error:', err);
        grid.innerHTML = '<p style="color:red;">Yazılar yüklenirken hata oluştu.</p>';
    }
}

async function loadPostDetail(postId) {
    const detailDiv = document.getElementById('post-detail');
    detailDiv.innerHTML = '<div style="text-align:center; width:100%">Yazı yükleniyor...</div>';
    
    try {
        const res = await fetch(`${API_URL}/posts/${postId}`);
        const post = await res.json();
        
        if(!post || !post.id) {
            detailDiv.innerHTML = '<p style="text-align:center; color:red;">Yazı bulunamadı.</p>';
            return;
        }

        detailDiv.innerHTML = `
            <div class="post-detail-card">
                <h2>${post.title}</h2>
                <div class="post-detail-meta">
                    <span>🖊️ ${post.author || 'Admin'}</span>
                    <span>📅 ${new Date(post.date).toLocaleDateString('tr-TR')}</span>
                </div>
                <div class="post-detail-content">${post.content}</div>
            </div>
        `;

        const imagesContainer = document.getElementById('post-images');
        const imagesGallery = document.getElementById('images-gallery');
        
        if (post.images && post.images.length > 0) {
            imagesGallery.innerHTML = '';
            post.images.forEach(imagePath => {
                const img = document.createElement('img');
                img.src = imagePath;
                img.alt = post.title;
                img.style.cursor = 'pointer';
                img.onclick = () => openImageModal(imagePath);
                imagesGallery.appendChild(img);
            });
            imagesContainer.style.display = 'block';
        } else {
            imagesContainer.style.display = 'none';
        }

        const commentsSection = document.getElementById('comments-section');
        if(commentsSection) {
            commentsSection.style.display = 'block';
            getComments(postId);
            setupCommentForm();
        }
    } catch (err) {
        console.error(err);
        detailDiv.innerHTML = '<p style="text-align:center; color:red;">Yazı yüklenirken hata oluştu.</p>';
    }
}

function addImageInput() {
    const container = document.getElementById('images-container');
    const inputId = 'image-input-' + Date.now();
    
    const div = document.createElement('div');
    div.style.marginBottom = '10px';
    div.style.display = 'flex';
    div.style.gap = '10px';
    div.innerHTML = `
        <input type="text" id="${inputId}" data-image-input placeholder="Örn: /media/resim1.jpg" style="flex: 1;">
        <button type="button" onclick="this.parentElement.remove()" class="btn-delete" style="width: auto;">Sil</button>
    `;
    
    container.appendChild(div);
}

function openImageModal(imagePath) {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const img = document.createElement('img');
    img.src = imagePath;
    img.style.cssText = 'max-width: 90%; max-height: 90%; border-radius: 10px;';
    
    modal.appendChild(img);
    modal.onclick = () => modal.remove();
    document.body.appendChild(modal);
}

function viewPostDetail(postId) {
    window.location.href = `post-detail.html?id=${postId}`;
}


async function addPost() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user || user.role !== 'admin') {
        alert('Yetkisiz işlem!');
        return;
    }

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();
    const tagsInput = document.getElementById('postTags').value;
    const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()) : [];
    
    if (!title || !content) {
        alert('Lütfen tüm alanları doldurun.');
        return;
    }

    const images = [];
    const imageInputs = document.querySelectorAll('input[data-image-input]');
    imageInputs.forEach(input => {
        const value = input.value.trim();
        if (value) images.push(value);
    });

    try {
        const newPost = { 
            title, 
            content, 
            author: user.username, 
            date: new Date().toISOString(),
            images ,
            tags
        };
        const res = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPost)
        });

        if (res.ok) {
            alert('Yazı eklendi!');
            document.getElementById('postTitle').value = '';
            document.getElementById('postContent').value = '';
            document.getElementById('images-container').innerHTML = '';
            loadAdminPosts();
        } else {
            alert('Yazı eklerken hata oluştu!');
        }
    } catch (err) {
        console.error('Add post error:', err);
        alert('Sunucu hatası!');
    }
}

async function loadAdminPosts() {
    const tbody = document.getElementById('admin-posts-body');
    const res = await fetch(`${API_URL}/posts`);
    const posts = await res.json();

    tbody.innerHTML = '';
    posts.reverse().forEach(post => {
        tbody.innerHTML += `
            <tr>
                <td>${post.title}</td>
                <td>${new Date(post.date).toLocaleDateString('tr-TR')}</td>
                <td>
                    <button onclick="deletePost('${post.id}')" class="btn-delete">Sil</button>
                </td>
            </tr>
        `;
    });
}

async function deletePost(id) {
    if(confirm('Silmek istediğine emin misin?')) {
        await fetch(`${API_URL}/posts/${id}`, { method: 'DELETE' });
        loadAdminPosts();
    }
}

async function getComments(postId) {
    if (!postId) return;
    
    try {
        const response = await fetch(`${API_URL}/comments?postId=${postId}`);
        if (!response.ok) throw new Error('Yorumlar yüklenemedi');
        
        const comments = await response.json();
        const listDiv = document.getElementById('comments-list');
        const countBadge = document.getElementById('commentCount');
        
        if (!listDiv) return;
        
        if (countBadge) countBadge.textContent = comments.length;
        listDiv.innerHTML = '';

        if (comments.length === 0) {
            listDiv.innerHTML = '<p style="text-align:center; color:#999">Henüz yorum yok.</p>';
            return;
        }

        comments.reverse().forEach(comment => {
            const date = new Date(comment.date).toLocaleString('tr-TR');
            const div = document.createElement('div');
            div.className = 'comment-item';
            div.innerHTML = `
                <div class="comment-meta">
                    <strong>👤 ${comment.user}</strong> • ${date}
                </div>
                <div class="comment-text">${comment.text}</div>
            `;
            listDiv.appendChild(div);
        });
    } catch (error) {
        console.error('Comments error:', error);
    }
}

async function addComment() {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        alert('Yorum yapılabilecek bir yazı seçilmedi!');
        return;
    }

    const user = JSON.parse(localStorage.getItem('currentUser'));
    const usernameInput = document.getElementById('username');
    const text = document.getElementById('commentText').value.trim();
    
    if (!text) {
        alert('Yorum metni boş olamaz!');
        return;
    }

    const username = user ? user.username : usernameInput.value.trim();

    if (!username) {
        alert('Lütfen bir ad girin!');
        return;
    }

    try {
        await fetch(`${API_URL}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, user: username, text, date: new Date() })
        });
        
        document.getElementById('commentText').value = '';
        if (usernameInput) usernameInput.value = '';
        getComments(postId);
    } catch (err) {
        console.error('Add comment error:', err);
        alert('Yorum eklerken hata oluştu!');
    }
}

function setupCommentForm() {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const input = document.getElementById('commentText');
    const count = document.getElementById('charCount');
    const usernameGroup = document.getElementById('username-group');
    
    if (usernameGroup) {
        usernameGroup.style.display = user ? 'none' : 'block';
    }
    
    if (input && count) {
        input.addEventListener('input', () => {
            count.textContent = input.value.length;
        });
    }
}