import tensorflow as tf
import numpy as np


from flask import Flask, render_template
from flask import request

app = Flask(__name__)
model = tf.keras.models.load_model('my_model')

@app.route('/', methods=['GET'])
def index():
    if request.method == 'GET':
      return render_template('index.html')


@app.route('/predict', methods=['POST'])
def predict():
    if request.method == 'POST':
        data = request.json
        data_b = []
        data_w = []
        for row in data:
          row_b = []
          row_w = []
          for i in range(len(row)):
            if row[i] == -1:
              row_b.append(0)
              row_w.append(1)
            elif row[i] == 0:
              row_b.append(0)
              row_w.append(0)
            if row[i] == 1:
              row_b.append(1)
              row_w.append(0)
          data_b.append(row_b)
          data_w.append(row_w)
        board_data = np.array([[data_b, data_w]], dtype=np.int8)
        predicted = model.predict(board_data)
        return [int(np.argmax(predicted))]

        
if __name__ == "__main__":
    app.run(debug=True, port=8888, threaded=True)
