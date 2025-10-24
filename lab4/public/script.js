class DocumentManager {
    constructor() {
        this.documents = [];
        this.editingId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadDocuments();
        this.setDefaultDate();
    }

    bindEvents() {
        const form = document.getElementById('document-form');
        const cancelBtn = document.getElementById('cancel-btn');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit();
        });

        cancelBtn.addEventListener('click', () => {
            this.cancelEdit();
        });
    }

    setDefaultDate() {
        const dateGivenInput = document.getElementById('dateGiven');
        const today = new Date().toISOString().split('T')[0];
        dateGivenInput.value = today;
    }

    async loadDocuments() {
        try {
            const response = await fetch('/api/documents');
            if (!response.ok) {
                throw new Error('Помилка завантаження документів');
            }
            this.documents = await response.json();
            this.renderDocuments();
        } catch (error) {
            console.error('Error loading documents:', error);
            this.showNotification('Помилка завантаження документів', 'error');
            this.renderDocuments();
        }
    }

    renderDocuments() {
        const tbody = document.getElementById('documents-list');
        
        if (this.documents.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-row">
                    <td colspan="6">Документів не знайдено. Додайте перший документ!</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.documents.map(doc => `
            <tr>
                <td>${this.escapeHtml(doc.executor)}</td>
                <td>${this.escapeHtml(doc.document)}</td>
                <td>${this.formatDate(doc.dateGiven)}</td>
                <td>${doc.dateReturned ? this.formatDate(doc.dateReturned) : '—'}</td>
                <td>
                    <span class="status ${doc.dateReturned ? 'returned' : 'active'}">
                        ${doc.dateReturned ? 'Повернено' : 'Активний'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-edit" onclick="documentManager.editDocument('${doc._id}')">
                            Редагувати
                        </button>
                        <button class="btn btn-delete" onclick="documentManager.deleteDocument('${doc._id}')">
                            Видалити
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async handleSubmit() {
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            let response;
            if (this.editingId) {
                response = await fetch(`/api/documents/${this.editingId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
            } else {
                response = await fetch('/api/documents', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Помилка збереження документа');
            }

            const result = await response.json();
            
            if (this.editingId) {
                const index = this.documents.findIndex(doc => doc._id === this.editingId);
                if (index !== -1) {
                    this.documents[index] = result;
                }
                this.showNotification('Документ успішно оновлено!', 'success');
                this.cancelEdit();
            } else {
                this.documents.push(result);
                this.showNotification('Документ успішно додано!', 'success');
            }
            
            this.renderDocuments();
            this.resetForm();
        } catch (error) {
            console.error('Error saving document:', error);
            this.showNotification(error.message, 'error');
        }
    }

    async editDocument(id) {
        const doc = this.documents.find(d => d._id === id);
        if (!doc) return;

        this.editingId = id;
        
        document.getElementById('executor').value = doc.executor;
        document.getElementById('document').value = doc.document;
        document.getElementById('dateGiven').value = this.formatDateForInput(doc.dateGiven);
        document.getElementById('dateReturned').value = doc.dateReturned ? this.formatDateForInput(doc.dateReturned) : '';
        document.getElementById('document-id').value = id;
        
        document.getElementById('form-title').textContent = 'Редагувати документ';
        document.getElementById('submit-btn').textContent = 'Оновити документ';
        document.getElementById('cancel-btn').style.display = 'inline-block';
        
        // Прокрутка до форми
        document.querySelector('.form-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }

    async deleteDocument(id) {
        const doc = this.documents.find(d => d._id === id);
        if (!doc) return;

        if (!confirm(`Ви впевнені, що хочете видалити документ "${doc.document}"?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/documents/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Помилка видалення документа');
            }

            this.documents = this.documents.filter(d => d._id !== id);
            this.renderDocuments();
            this.showNotification('Документ успішно видалено!', 'success');
            
            // Якщо видаляємо документ, який редагуємо
            if (this.editingId === id) {
                this.cancelEdit();
            }
        } catch (error) {
            console.error('Error deleting document:', error);
            this.showNotification(error.message, 'error');
        }
    }

    cancelEdit() {
        this.editingId = null;
        this.resetForm();
        
        document.getElementById('form-title').textContent = 'Додати новий документ';
        document.getElementById('submit-btn').textContent = 'Додати документ';
        document.getElementById('cancel-btn').style.display = 'none';
        document.getElementById('document-id').value = '';
    }

    getFormData() {
        return {
            executor: document.getElementById('executor').value.trim(),
            document: document.getElementById('document').value.trim(),
            dateGiven: document.getElementById('dateGiven').value,
            dateReturned: document.getElementById('dateReturned').value || null
        };
    }

    validateForm(data) {
        if (!data.executor || data.executor.length < 5) {
            this.showNotification('Введіть повне ім\'я виконавця (мінімум 5 символів)', 'error');
            return false;
        }

        if (!data.document || data.document.length < 5) {
            this.showNotification('Введіть назву документа (мінімум 5 символів)', 'error');
            return false;
        }

        if (!data.dateGiven) {
            this.showNotification('Введіть дату передачі документа', 'error');
            return false;
        }

        // Перевірка дат
        if (data.dateReturned && data.dateReturned < data.dateGiven) {
            this.showNotification('Дата повернення не може бути раніше дати передачі', 'error');
            return false;
        }

        return true;
    }

    resetForm() {
        document.getElementById('document-form').reset();
        this.setDefaultDate();
    }

    formatDate(dateString) {
        if (!dateString) return '—';
        
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    formatDateForInput(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        
        // Показати повідомлення
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Приховати через 3 секунди
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

// Ініціалізація додатку
const documentManager = new DocumentManager();

// Робимо доступним глобально для onclick handlers
window.documentManager = documentManager;