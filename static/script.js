let vqaData = [];
let currentIndex = 0;
let currentCategory = '';
let currentEpisode = '';
let episodeList = [];
let categoryList = [];

// Fetch VQA data from the server
async function fetchData() {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append('limit', 1000);
        
        if (currentCategory) {
            queryParams.append('category', currentCategory);
        }
        
        if (currentEpisode) {
            queryParams.append('episode', currentEpisode);
        }
        
        const response = await fetch(`/api/vqa_data?${queryParams.toString()}`);
        const data = await response.json();
        vqaData = data.data;
        
        if (vqaData.length > 0) {
            updatePageInfo();
            displayVQA(0);  // Reset to first item when filtering
            currentIndex = 0;
        } else {
            document.getElementById('question-text').textContent = 'No items found with current filters.';
            document.getElementById('question-images').innerHTML = '';
            document.getElementById('choices-container').innerHTML = '';
            document.getElementById('page-info').textContent = 'No items';
            document.getElementById('prev-btn').disabled = true;
            document.getElementById('next-btn').disabled = true;
        }
    } catch (error) {
        console.error('Error fetching VQA data:', error);
    }
}

// Fetch episodes
async function fetchEpisodes() {
    try {
        const response = await fetch('/api/episodes');
        const data = await response.json();
        episodeList = data.episodes;
        
        // Populate episode filter dropdown
        const episodeFilter = document.getElementById('episode-filter');
        episodeFilter.innerHTML = '<option value="">All Episodes</option>';
        
        episodeList.forEach(episode => {
            const option = document.createElement('option');
            option.value = episode;
            option.textContent = episode;
            episodeFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching episodes:', error);
    }
}

// Display a specific VQA item
function displayVQA(index) {
    const vqa = vqaData[index];
    
    // Display question text
    document.getElementById('question-text').textContent = vqa.question.text;
    
    // Display episode info and tag
    const episodeInfo = document.getElementById('episode-info');
    episodeInfo.innerHTML = '';
    
    // Add unique ID
    if (vqa.unique_id) {
        const idSpan = document.createElement('span');
        idSpan.textContent = `ID: ${vqa.unique_id}`;
        episodeInfo.appendChild(idSpan);
    }
    
    if (vqa.episode_dir) {
        const episodeSpan = document.createElement('span');
        episodeSpan.textContent = `Episode: ${vqa.episode_dir}`;
        episodeInfo.appendChild(episodeSpan);
    }
    
    // Display tag if available
    const tag = vqa.metadata?.tag;
    if (tag) {
        const tagSpan = document.createElement('span');
        tagSpan.className = 'category-tag';
        tagSpan.textContent = tag;
        episodeInfo.appendChild(tagSpan);
    }
    
    // Show/hide episode info section
    episodeInfo.style.display = episodeInfo.children.length > 0 ? 'flex' : 'none';
    
    // Display question images
    const questionImagesContainer = document.getElementById('question-images');
    questionImagesContainer.innerHTML = '';
    
    if (vqa.question.image_ids) {
        vqa.question.image_ids.forEach(imageId => {
            if (imageId) {
                const img = document.createElement('img');
                img.src = `/api/images/${imageId}`;
                img.alt = 'Question Image';
                img.loading = 'lazy'; // Lazy load images
                
                // Add click to enlarge functionality
                img.addEventListener('click', function() {
                    if (this.classList.contains('enlarged')) {
                        this.classList.remove('enlarged');
                    } else {
                        // Remove enlarged class from all other images
                        document.querySelectorAll('.image-gallery img.enlarged').forEach(img => {
                            img.classList.remove('enlarged');
                        });
                        this.classList.add('enlarged');
                    }
                });
                
                questionImagesContainer.appendChild(img);
            }
        });
    }
    
    // Display choices
    const choicesContainer = document.getElementById('choices-container');
    choicesContainer.innerHTML = '';
    
    vqa.choices.forEach((choice, idx) => {
        const choiceItem = document.createElement('div');
        choiceItem.className = `choice-item ${choice.is_correct ? 'correct' : ''}`;
        
        const choiceLabel = document.createElement('div');
        choiceLabel.className = 'choice-text';
        choiceLabel.textContent = `${String.fromCharCode(65 + idx)}. ${choice.text} ${choice.is_correct ? '(Correct)' : ''}`;
        choiceItem.appendChild(choiceLabel);
        
        if (choice.image_id) {
            const img = document.createElement('img');
            img.src = `/api/images/${choice.image_id}`;
            img.alt = `Choice ${String.fromCharCode(65 + idx)} Image`;
            img.className = 'choice-image';
            img.loading = 'lazy'; // Lazy load images
            
            // Add click to enlarge functionality for choice images too
            img.addEventListener('click', function() {
                if (this.classList.contains('enlarged')) {
                    this.classList.remove('enlarged');
                } else {
                    document.querySelectorAll('.choice-image.enlarged').forEach(img => {
                        img.classList.remove('enlarged');
                    });
                    this.classList.add('enlarged');
                }
            });
            
            choiceItem.appendChild(img);
        }
        
        choicesContainer.appendChild(choiceItem);
    });
    
    // Update button states
    document.getElementById('prev-btn').disabled = index <= 0;
    document.getElementById('next-btn').disabled = index >= vqaData.length - 1;
}

// Update the page info display
function updatePageInfo() {
    document.getElementById('page-info').textContent = `Item ${currentIndex + 1} of ${vqaData.length}`;
}

// Fetch categories
async function fetchCategories() {
    try {
        const response = await fetch('/api/categories');
        const data = await response.json();
        categoryList = data.categories;
        
        // Populate category filter dropdown
        const categoryFilter = document.getElementById('category-filter');
        categoryFilter.innerHTML = '<option value="">All Categories</option>';
        
        categoryList.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Fetch and display statistics
async function fetchStatistics() {
    try {
        const response = await fetch('/api/statistics');
        const stats = await response.json();
        
        const statsContainer = document.getElementById('stats-content');
        if (!statsContainer) return; // Skip if stats container doesn't exist
        
        statsContainer.innerHTML = '';
        
        // Total items
        const totalItem = document.createElement('div');
        totalItem.className = 'stat-item';
        totalItem.innerHTML = `<h3>Total Items</h3><p>${stats.total_items}</p>`;
        statsContainer.appendChild(totalItem);
        
        // Episodes
        const episodesItem = document.createElement('div');
        episodesItem.className = 'stat-item';
        episodesItem.innerHTML = `<h3>Episodes</h3>`;
        
        const episodesList = document.createElement('ul');
        for (const [episode, count] of Object.entries(stats.episodes)) {
            const li = document.createElement('li');
            li.textContent = `${episode}: ${count}`;
            episodesList.appendChild(li);
        }
        
        episodesItem.appendChild(episodesList);
        statsContainer.appendChild(episodesItem);
        
        // Categories
        const categoriesItem = document.createElement('div');
        categoriesItem.className = 'stat-item';
        categoriesItem.innerHTML = `<h3>Categories</h3>`;
        
        const categoryList = document.createElement('ul');
        for (const [category, count] of Object.entries(stats.categories)) {
            const li = document.createElement('li');
            li.textContent = `${category}: ${count}`;
            categoryList.appendChild(li);
        }
        categoriesItem.appendChild(categoryList);
        statsContainer.appendChild(categoriesItem);
        
        // Images
        const imagesItem = document.createElement('div');
        imagesItem.className = 'stat-item';
        imagesItem.innerHTML = `
            <h3>Images</h3>
            <p>With question images: ${stats.items_with_question_images}</p>
            <p>With choice images: ${stats.items_with_choice_images}</p>
        `;
        statsContainer.appendChild(imagesItem);
        
        // Correct answer distribution
        const distributionItem = document.createElement('div');
        distributionItem.className = 'stat-item';
        distributionItem.innerHTML = `<h3>Correct Answer Distribution</h3>`;
        
        const distributionList = document.createElement('ul');
        for (const [option, count] of Object.entries(stats.correct_answer_distribution)) {
            const li = document.createElement('li');
            li.textContent = `${option}: ${count}`;
            distributionList.appendChild(li);
        }
        distributionItem.appendChild(distributionList);
        statsContainer.appendChild(distributionItem);
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        const statsContainer = document.getElementById('stats-content');
        if (statsContainer) {
            statsContainer.textContent = 'Error loading statistics';
        }
    }
}

// Apply filters
function applyFilter() {
    currentCategory = document.getElementById('category-filter').value;
    currentEpisode = document.getElementById('episode-filter').value;
    fetchData();
}

// Event listeners for navigation buttons
document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        displayVQA(currentIndex);
        updatePageInfo();
    }
});

document.getElementById('next-btn').addEventListener('click', () => {
    if (currentIndex < vqaData.length - 1) {
        currentIndex++;
        displayVQA(currentIndex);
        updatePageInfo();
    }
});

// Event listener for filter button
document.getElementById('apply-filter').addEventListener('click', applyFilter);

// Add keyboard navigation
document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        if (currentIndex > 0) {
            currentIndex--;
            displayVQA(currentIndex);
            updatePageInfo();
        }
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        if (currentIndex < vqaData.length - 1) {
            currentIndex++;
            displayVQA(currentIndex);
            updatePageInfo();
        }
    }
});

// Fetch and display all examples in the gallery
async function loadAllExamples() {
    try {
        // Fetch all VQA data
        const response = await fetch('/api/vqa_data?limit=100');
        const data = await response.json();
        
        const examplesGallery = document.getElementById('examples-gallery');
        examplesGallery.innerHTML = '';
        
        // Process each VQA example
        data.data.forEach(item => {
            let imageId = null;
            
            // Try to get an image from the question
            if (item.question.image_ids && item.question.image_ids.length > 0) {
                imageId = item.question.image_ids[0];
            }
            
            // If no question image, try choices
            if (!imageId && item.choices.length > 0) {
                for (const choice of item.choices) {
                    if (choice.image_id) {
                        imageId = choice.image_id;
                        break;
                    }
                }
            }
            
            // Skip items without images
            if (!imageId) return;
            
            // Create example preview element
            const previewElement = document.createElement('div');
            previewElement.className = 'example-preview';
            
            // Get the category from metadata
            const category = item.metadata?.tag || 'uncategorized';
            
            // Add click handler to select this item
            previewElement.addEventListener('click', function() {
                // Find item index in the global vqaData array
                const idx = vqaData.findIndex(vqa => vqa.unique_id === item.unique_id);
                if (idx !== -1) {
                    currentIndex = idx;
                    displayVQA(currentIndex);
                    updatePageInfo();
                } else {
                    // If not found in current filtered list, filter by its category and try again
                    document.getElementById('category-filter').value = category;
                    applyFilter();
                    setTimeout(() => {
                        const newIdx = vqaData.findIndex(vqa => vqa.unique_id === item.unique_id);
                        if (newIdx !== -1) {
                            currentIndex = newIdx;
                            displayVQA(currentIndex);
                            updatePageInfo();
                        }
                    }, 500);
                }
            });
            
            // Create preview content
            let previewHTML = '';
            
            previewHTML += `<img src="/api/images/${imageId}" alt="Preview" loading="lazy">`;
            previewHTML += `<h3>${item.question.text}</h3>`;
            previewHTML += `<span class="category">${category}</span>`;
            
            previewElement.innerHTML = previewHTML;
            examplesGallery.appendChild(previewElement);
        });
    } catch (error) {
        console.error('Error loading examples:', error);
    }
}

// Initialize the page
window.addEventListener('DOMContentLoaded', () => {
    fetchEpisodes();
    fetchCategories();
    loadAllExamples();
    fetchData();
    fetchStatistics();
});
        