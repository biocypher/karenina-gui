import csv

# Generate a large CSV file with 1000 questions
with open('large_questions.csv', 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(['id', 'question', 'category', 'difficulty'])
    
    categories = ['Math', 'Science', 'History', 'Geography', 'Literature']
    difficulties = ['Easy', 'Medium', 'Hard']
    
    for i in range(1, 1001):
        category = categories[i % 5]
        difficulty = difficulties[i % 3]
        question = f"Sample question {i} about {category.lower()}"
        writer.writerow([i, question, category, difficulty])

print("Generated large_questions.csv with 1000 questions")