<?php
// Echo "onnecting to database" ;

// MYSQLi
  echo"<br>"; 
$servername = "localhost";
$username = "root";
$password = "";
$database="employeesystem";
// Create data base // DATABASWE $ is added after wards

 $conn= mysqli_connect ($servername, $username , $password , $database);

//connection object
  if (!$conn){
    die("Sorry we failed to Connect" .mysqli_connect_errno());
}else{
  echo "Connection was Successful"."<br>";
}

$sql= "CREATE DATABASE systemm";
$result = mysqli_query( $conn ,$sql);



// check if data base is created
if ($result){
     echo("the database is created" ."<br>") ;
}else {
    echo"sorry the database is not created " . mysqli_error($conn) ;

}



?>