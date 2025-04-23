let vqaData = [];
let currentIndex = 0;
let currentCategory = '';
let currentEpisode = '';
let episodeList = [];
let categoryList = [];
let categoryChart = null;
let categoryData = {};

// Register Chart.js DataLabels plugin
Chart.register(ChartDataLabels);

// Variables to track double-click
let lastClickedTime = 0;
let lastClickedIndex = -1;
const doubleClickThreshold = 300; // milliseconds

// Fetch VQA data from the server
async function fetchData() {
    try {
        // Create a query object for filtering
        let filteredData = vqaData;
        
        // Apply category filter if needed
        if (currentCategory) {
            filteredData = filteredData.filter(item => 
                item.metadata && item.metadata.tag === currentCategory);
        }
        
        // Apply episode filter if needed
        if (currentEpisode) {
            filteredData = filteredData.filter(item => 
                item.episode_dir === currentEpisode);
        }
        
        // For GitHub Pages, we need to load all data first if not already loaded
        if (vqaData.length === 0) {
            const response = await fetch('data/vqa_data.json');
            const allData = await response.json();
            vqaData = allData;
            filteredData = vqaData;
            
            // Re-apply filters after loading
            if (currentCategory) {
                filteredData = filteredData.filter(item => 
                    item.metadata && item.metadata.tag === currentCategory);
            }
            
            if (currentEpisode) {
                filteredData = filteredData.filter(item => 
                    item.episode_dir === currentEpisode);
            }
        }
        
        // Paginate data (limited to 100 items for now)
        filteredData = filteredData.slice(0, 100);
        
        if (filteredData.length > 0) {
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
        const response = await fetch('data/episodes.json');
        const data = await response.json();
        episodeList = data.episodes;
        
        // Populate episode filter dropdown
        const episodeFilter = document.getElementById('episode-filter');
        if (episodeFilter) {
            episodeFilter.innerHTML = '<option value="">All Episodes</option>';
            
            episodeList.forEach(episode => {
                const option = document.createElement('option');
                option.value = episode;
                option.textContent = episode;
                episodeFilter.appendChild(option);
            });
        }
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
                img.src = `images/${imageId}`;
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
            img.src = `images/${choice.image_id}`;
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

// Fetch categories and create pie chart
async function fetchCategories() {
    try {
        const response = await fetch('data/categories.json');
        const data = await response.json();
        categoryList = data.categories;
        categoryData = data.counts;
        
        // Create or update the pie chart
        createCategoryChart();
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
}

// Create category pie chart
function createCategoryChart() {
    const ctx = document.getElementById('category-chart').getContext('2d');
    
    // Prepare data for chart
    const labels = Object.keys(categoryData);
    const data = Object.values(categoryData);
    
    // Generate colors for each category
    const colors = generateColors(labels.length);
    
    // Destroy existing chart if it exists
    if (categoryChart) {
        categoryChart.destroy();
    }
    
    // Create new chart
    categoryChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels.map((label, i) => `${label} (${data[i]})`),
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        boxWidth: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${percentage}%`;
                        }
                    }
                },
                datalabels: {
                    display: function(context) {
                        return context.dataset.data[context.dataIndex] > 0;
                    },
                    color: '#444444',
                    font: {
                        weight: 'bold',
                        size: 14
                    },
                    formatter: function(value, context) {
                        return value;
                    },
                    align: 'center',
                    anchor: 'center',
                    textStrokeColor: 'rgba(255,255,255,0.7)',
                    textStrokeWidth: 4,
                    borderRadius: 4,
                    padding: 4
                }
            },
            onClick: handleChartClick
        }
    });
}

// Generate colors for pie chart segments
function generateColors(count) {
    const colors = [];
    const morandiColors = [
        // Muted reds
        '#C8ADA0', '#D1B2A8', '#E2BFB3', '#BEA299', '#AD8F84',
        // Muted blues
        '#A2B5C7', '#B6C5D1', '#C7D3DB', '#8CA3B4', '#7A95A9',
        // Muted purples
        '#B2A8B9', '#C4B8C8', '#D4CDD8', '#9C93A4', '#857992',
        // Muted greens
        '#A9BBA0', '#C0CDBB', '#D1D9CA', '#8CA085', '#77927A',
        // Additional earth tones
        '#D4C4B7', '#BEB6A9', '#A49B8C', '#8C857A', '#6C6359'
    ];
    
    for (let i = 0; i < count; i++) {
        if (i < morandiColors.length) {
            colors.push(morandiColors[i]);
        } else {
            // Generate random muted Morandi-like colors with varied hues
            const hueRanges = [
                [0, 30],    // reds
                [180, 240], // blues
                [250, 290], // purples
                [90, 150]   // greens
            ];
            
            // Randomly select one of the hue ranges
            const selectedRange = hueRanges[Math.floor(Math.random() * hueRanges.length)];
            const h = Math.floor(Math.random() * (selectedRange[1] - selectedRange[0])) + selectedRange[0];
            const s = Math.floor(Math.random() * 25) + 15; // Low-medium saturation (15-40%)
            const l = Math.floor(Math.random() * 25) + 60; // Medium-high lightness (60-85%)
            
            colors.push(`hsl(${h}, ${s}%, ${l}%)`);
        }
    }
    
    return colors;
}

// Handle click on pie chart segments
function handleChartClick(event, elements) {
    const now = new Date().getTime();
    
    if (elements.length > 0) {
        const clickedIndex = elements[0].index;
        const fullLabel = categoryChart.data.labels[clickedIndex];
        // Extract just the category name without the count
        const category = Object.keys(categoryData)[clickedIndex];
        
        // Check for double-click on the same segment
        if (clickedIndex === lastClickedIndex && (now - lastClickedTime) < doubleClickThreshold) {
            // Double-click detected, unselect the category
            currentCategory = '';
            document.getElementById('selected-category-text').textContent = 'All Categories';
            
            // Reset all segment colors to their original state
            const dataset = categoryChart.data.datasets[0];
            const backgroundColors = dataset.backgroundColor;
            const originalColors = generateColors(categoryChart.data.labels.length);
            
            for (let i = 0; i < backgroundColors.length; i++) {
                backgroundColors[i] = originalColors[i];
            }
            
            categoryChart.update();
            
            // Reset the last clicked tracking
            lastClickedTime = 0;
            lastClickedIndex = -1;
            return;
        }
        
        // Update tracking for double-click detection
        lastClickedTime = now;
        lastClickedIndex = clickedIndex;
        
        // Update selected category
        currentCategory = category;
        document.getElementById('selected-category-text').textContent = fullLabel;
        
        // Highlight the selected segment
        const dataset = categoryChart.data.datasets[0];
        const backgroundColors = dataset.backgroundColor;
        const originalColors = generateColors(categoryChart.data.labels.length);
        
        // Reset all segment colors
        for (let i = 0; i < backgroundColors.length; i++) {
            if (i === clickedIndex) {
                // Make the selected segment brighter
                const color = originalColors[i];
                const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                if (rgbMatch) {
                    const r = Math.min(255, parseInt(rgbMatch[1]) + 40);
                    const g = Math.min(255, parseInt(rgbMatch[2]) + 40);
                    const b = Math.min(255, parseInt(rgbMatch[3]) + 40);
                    backgroundColors[i] = `rgb(${r}, ${g}, ${b})`;
                } else {
                    // If color format is different, just use a highlight color
                    backgroundColors[i] = '#FFD700';
                }
            } else {
                // Restore original color
                backgroundColors[i] = originalColors[i];
            }
        }
        
        categoryChart.update();
    } else {
        // Clicked outside any segment, reset to all categories
        currentCategory = '';
        document.getElementById('selected-category-text').textContent = 'All Categories';
        lastClickedTime = 0;
        lastClickedIndex = -1;
    }
}

// Fetch and display statistics
async function fetchStatistics() {
    try {
        const response = await fetch('data/statistics.json');
        const stats = await response.json();
        
        const statsContainer = document.getElementById('stats-content');
        if (!statsContainer) return; // Skip if stats container doesn't exist
        
        // Update VQA dataset overview with statistics
        const totalItems = stats.total_items || 0;
        const totalQuestionImages = stats.items_with_question_images || 0;
        const totalChoiceImages = stats.items_with_choice_images || 0;
        const totalImages = totalQuestionImages + totalChoiceImages;
        
        // Update the description
        const descIntro = document.querySelector('.description-intro');
        if (descIntro) {
            descIntro.innerHTML = `
                <span class="highlight">📊 Visual Question Answering</span> dataset contains 
                <span class="highlight">${totalItems} questions</span> about 
                <span class="highlight">${totalImages} images</span>.
            `;
        }
        
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
    currentEpisode = document.getElementById('episode-filter').value;
    // currentCategory is already updated when clicking on the pie chart
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
        // For GitHub Pages, we need to load all data first if not already loaded
        if (vqaData.length === 0) {
            const response = await fetch('data/vqa_data.json');
            const allData = await response.json();
            vqaData = allData;
        }
        
        // Limit to 100 examples for performance
        const exampleData = vqaData.slice(0, 100);
        
        const examplesGallery = document.getElementById('examples-gallery');
        examplesGallery.innerHTML = '';
        
        // Process each VQA example
        exampleData.forEach(item => {
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
                    currentCategory = category;
                    document.getElementById('selected-category-text').textContent = category;
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
            
            previewHTML += `<img src="images/${imageId}" alt="Preview" loading="lazy">`;
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
        