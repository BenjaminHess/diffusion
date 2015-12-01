<%--
 Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements.  See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License.  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
--%>
<html>
<head>
<title>Login Page for Crows Nest</title>
<link href="bootstrap/css/bootstrap.min.css" rel="stylesheet" media="screen"/>
<style type="text/css">
/*Override style for this page only*/
  html, body {
  background-color: #eee;
  }

  body{
    padding-top: 40px;
  }

  .container{
    width: 300px;
    padding-left: 150px;
  }
  .container > .content {
    background-color: #fff;
    padding: 20px;
    margin: 0 -20px; 
    -webkit-border-radius: 10px 10px 10px 10px;
    -moz-border-radius: 10px 10px 10px 10px;
    border-radius: 10px 10px 10px 10px;
    -webkit-box-shadow: 0 1px 2px rgba(0,0,0,.15);
    -moz-box-shadow: 0 1px 2px rgba(0,0,0,.15);
    box-shadow: 0 1px 2px rgba(0,0,0,.15);
    }

  .login-form {
    margin-left: 65px;
  }
  
  legend {
    margin-right: -50px;
    font-weight: bold;
    color: #404040;
  }
  
  .form-signin-heading {
   color: #3a87ad;
  }
</style>
</head>
<body>
<div class="container">

        <form class="form-signin"method="POST" action='<%= response.encodeURL("j_security_check") %>' >
          <h2 class="form-signin-heading">Cyber4Sight Login</h2>
        <fieldset>
            <input class="form-control" type="text" name="j_username" placeholder="Username">
            <input class="form-control" type="password" name="j_password" placeholder="Password">

                <button type="submit" class="btn btn-primary">Log In</button>

                <button type="reset" class = "btn btn-warning">Reset</button>

        </fieldset>
      </form>
</div>
</body>
</html>
